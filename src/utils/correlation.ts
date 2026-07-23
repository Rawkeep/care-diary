// Muster sichtbar machen — rein beschreibende Aufbereitung dokumentierter
// Daten (Tageszeit der Ereignisse, ereignisfreie Tage, Zustand im Vergleich,
// Messwert-Reihen). Keine Kausalaussagen, keine Bewertung: die App zählt und
// gruppiert nur, die Einordnung gehört ins ärztliche Gespräch (KONZEPT §3).
import type { HealthEvent, Measurement, Observation } from '../db/models';
import type { ObservationStat } from './aggregate';
import { localDayKey } from './date';
import type { TrendPoint } from './trend';

// --- Tageszeit-Verteilung -------------------------------------------------

export type DaySlot = 'night' | 'morning' | 'afternoon' | 'evening';

export const SLOT_ORDER: DaySlot[] = ['night', 'morning', 'afternoon', 'evening'];

export const SLOT_LABEL: Record<DaySlot, string> = {
  night: 'Nachts (0–6 Uhr)',
  morning: 'Morgens (6–12 Uhr)',
  afternoon: 'Nachmittags (12–18 Uhr)',
  evening: 'Abends (18–24 Uhr)',
};

/** Tageszeit-Slot eines Zeitpunkts (lokale Zeit) */
export function timeOfDaySlot(iso: string): DaySlot {
  const h = new Date(iso).getHours();
  if (h < 6) return 'night';
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

/** Ereignis-Anzahl je Tageszeit-Slot */
export function timeOfDayHistogram(events: HealthEvent[]): Record<DaySlot, number> {
  const out: Record<DaySlot, number> = { night: 0, morning: 0, afternoon: 0, evening: 0 };
  for (const e of events) out[timeOfDaySlot(e.startedAt)] += 1;
  return out;
}

// --- Ereignisfreie Tage ---------------------------------------------------

/** Day-Key um n Tage verschieben (lokal, DST-sicher über Mittag) */
export function addDays(dayKey: string, n: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12);
  date.setDate(date.getDate() + n);
  return localDayKey(date.toISOString());
}

/**
 * Tage seit dem letzten dokumentierten Ereignis (0 = heute, 1 = gestern …).
 * null, wenn kein Ereignis bis einschließlich heute dokumentiert ist.
 */
export function daysSinceLastEvent(events: HealthEvent[], todayKey: string): number | null {
  let last: string | null = null;
  for (const e of events) {
    const day = localDayKey(e.startedAt);
    if (day <= todayKey && (last === null || day > last)) last = day;
  }
  if (last === null) return null;
  const [y1, m1, d1] = last.split('-').map(Number);
  const [y2, m2, d2] = todayKey.split('-').map(Number);
  const ms = new Date(y2, m2 - 1, d2, 12).getTime() - new Date(y1, m1 - 1, d1, 12).getTime();
  return Math.round(ms / 86_400_000);
}

// --- Zustand im Vergleich (ereignisfreie vs. Ereignis-nahe Tage) ----------

export interface ProximityComparison {
  /** Tage mit Ereignis bzw. bis windowDays danach */
  near: ObservationStat | null;
  /** ereignisfreie Tage (außerhalb des Fensters) */
  free: ObservationStat | null;
}

function stat(values: number[]): ObservationStat | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return { n: values.length, avg: sum / values.length, min: Math.min(...values), max: Math.max(...values) };
}

/**
 * Vergleicht Zustands-Werte je Parameter: Tage mit/kurz nach einem Ereignis
 * („near": Ereignistag + windowDays Folgetage) gegen ereignisfreie Tage.
 * Beschreibende Statistik über dokumentierte Beobachtungen — keine Kausalaussage.
 */
export function stateByEventProximity(
  observations: Observation[],
  events: HealthEvent[],
  windowDays = 1
): Map<string, ProximityComparison> {
  const nearDays = new Set<string>();
  for (const e of events) {
    const day = localDayKey(e.startedAt);
    for (let i = 0; i <= windowDays; i++) nearDays.add(addDays(day, i));
  }

  const byParam = new Map<string, { near: number[]; free: number[] }>();
  for (const o of observations) {
    const group = byParam.get(o.parameter) ?? { near: [], free: [] };
    (nearDays.has(localDayKey(o.at)) ? group.near : group.free).push(o.value);
    byParam.set(o.parameter, group);
  }

  const out = new Map<string, ProximityComparison>();
  for (const [param, { near, free }] of byParam) {
    out.set(param, { near: stat(near), free: stat(free) });
  }
  return out;
}

// --- Messwert-Reihen (z. B. Gewicht) --------------------------------------

/** Tages-Ø einer Messwert-Reihe innerhalb des Anzeigefensters */
export function measurementSeries(measurements: Measurement[], days: string[]): TrendPoint[] {
  const sums = new Map<string, { sum: number; n: number }>();
  for (const m of measurements) {
    const key = localDayKey(m.at);
    const rec = sums.get(key) ?? { sum: 0, n: 0 };
    rec.sum += m.value;
    rec.n += 1;
    sums.set(key, rec);
  }
  const out: TrendPoint[] = [];
  days.forEach((day, dayIndex) => {
    const rec = sums.get(day);
    if (rec) out.push({ day, dayIndex, value: rec.sum / rec.n });
  });
  return out;
}
