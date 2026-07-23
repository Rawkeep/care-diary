// Aggregations-Kern für Verlaufsansichten und (später) Arzt-Reports.
// Deterministisch und getestet — das fachliche Herz der App
// („die App dokumentiert, der Arzt entscheidet": hier wird nur gezählt,
// nie interpretiert).
import type { HealthEvent, Intake, IntakeStatus, Observation } from '../db/models';
import { localDayKey } from './date';

/** Vereinheitlichter Verlaufseintrag für die chronologische Liste */
export interface DiaryItem {
  kind: 'intake' | 'event' | 'observation';
  at: string;
  ref: Intake | HealthEvent | Observation;
}

export function mergeChronological(
  intakes: Intake[],
  events: HealthEvent[],
  observations: Observation[]
): DiaryItem[] {
  const items: DiaryItem[] = [
    ...intakes.map((i): DiaryItem => ({ kind: 'intake', at: i.at, ref: i })),
    ...events.map((e): DiaryItem => ({ kind: 'event', at: e.startedAt, ref: e })),
    ...observations.map((o): DiaryItem => ({ kind: 'observation', at: o.at, ref: o })),
  ];
  // Neueste zuerst; bei Zeitgleichheit stabile Ordnung über die Art
  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.kind.localeCompare(b.kind)));
}

/** Gruppiert Verlaufseinträge nach lokalem Tag (Map behält Einfüge-Reihenfolge). */
export function groupByDay(items: DiaryItem[]): Map<string, DiaryItem[]> {
  const groups = new Map<string, DiaryItem[]>();
  for (const item of items) {
    const key = localDayKey(item.at);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

/** Ereignis-Zähler je Typ, z. B. für „wie oft, welche Art" */
export function countEventsByType(events: HealthEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
  return counts;
}

/** Summierte Ereignisdauer in Sekunden (nur Ereignisse mit erfasster Dauer) */
export function totalEventDurationSeconds(events: HealthEvent[]): number {
  return events.reduce((sum, e) => sum + (e.durationSeconds ?? 0), 0);
}

/** Filtert Einträge eines lokalen Tages (z. B. Heute-Ansicht) */
export function itemsOfDay(items: DiaryItem[], dayKey: string): DiaryItem[] {
  return items.filter((i) => localDayKey(i.at) === dayKey);
}

/** Zeilen auf einen lokalen Tages-Zeitraum [from, to] filtern (Day-Keys, inklusiv) */
export function inDayRange<T>(rows: T[], at: (row: T) => string, from: string, to: string): T[] {
  return rows.filter((row) => {
    const key = localDayKey(at(row));
    return key >= from && key <= to;
  });
}

/** Ereignis-Anzahl je lokalem Tag — Basis des Anfallskalenders */
export function eventCountByDay(events: HealthEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const e of events) {
    const key = localDayKey(e.startedAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Einnahme-Status-Zähler je Medikament (genommen/ausgelassen/…) */
export function intakeStatusByMedication(
  intakes: Intake[]
): Map<string, Record<IntakeStatus, number>> {
  const out = new Map<string, Record<IntakeStatus, number>>();
  for (const i of intakes) {
    const rec = out.get(i.medicationId) ?? { taken: 0, missed: 0, late: 0, vomited: 0 };
    rec[i.status] += 1;
    out.set(i.medicationId, rec);
  }
  return out;
}

export interface ObservationStat {
  n: number;
  avg: number;
  min: number;
  max: number;
}

/** Einfache Kennzahlen je Zustands-Parameter — Darstellung, keine Bewertung */
export function observationStats(rows: Observation[]): Map<string, ObservationStat> {
  const grouped = new Map<string, number[]>();
  for (const o of rows) {
    const list = grouped.get(o.parameter);
    if (list) list.push(o.value);
    else grouped.set(o.parameter, [o.value]);
  }
  const out = new Map<string, ObservationStat>();
  for (const [param, values] of grouped) {
    const sum = values.reduce((a, b) => a + b, 0);
    out.set(param, {
      n: values.length,
      avg: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    });
  }
  return out;
}

/** Monate (month 0-basiert) zwischen zwei Day-Keys, inklusive beider Ränder */
export function monthsBetween(fromDay: string, toDay: string): { year: number; month: number }[] {
  const [fy, fm] = fromDay.split('-').map(Number);
  const [ty, tm] = toDay.split('-').map(Number);
  const out: { year: number; month: number }[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push({ year: y, month: m - 1 });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    if (out.length > 2000) break; // Schutz vor degenerierten Zeiträumen
  }
  return out;
}
