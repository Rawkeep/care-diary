// Zustands-Verlauf: deterministische Aufbereitung der 1–5-Werte für die
// Sparkline-Darstellung (Tages-Ø + Glättung über ±N Tage). Nur Darstellung,
// keine Bewertung — Phasen erkennen bleibt Mensch und Arzt überlassen.
import type { Observation } from '../db/models';
import { localDayKey } from './date';

export interface TrendPoint {
  day: string;
  /** Position innerhalb des Anzeigefensters (0 = erster Tag) */
  dayIndex: number;
  value: number;
}

/** Alle Day-Keys von from bis to (inklusive), max. 1000 Tage */
export function dayRange(fromDay: string, toDay: string): string[] {
  const [fy, fm, fd] = fromDay.split('-').map(Number);
  const out: string[] = [];
  const cur = new Date(fy, fm - 1, fd, 12);
  for (let i = 0; i < 1000; i++) {
    const key = localDayKey(cur.toISOString());
    if (key > toDay) break;
    out.push(key);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Tages-Durchschnitt je Day-Key für einen Parameter */
export function dailyAverages(rows: Observation[], parameter: string): Map<string, number> {
  const sums = new Map<string, { sum: number; n: number }>();
  for (const o of rows) {
    if (o.parameter !== parameter) continue;
    const key = localDayKey(o.at);
    const rec = sums.get(key) ?? { sum: 0, n: 0 };
    rec.sum += o.value;
    rec.n += 1;
    sums.set(key, rec);
  }
  const out = new Map<string, number>();
  for (const [key, { sum, n }] of sums) out.set(key, sum / n);
  return out;
}

/** Punktreihe eines Parameters innerhalb des Fensters (nur Tage mit Daten) */
export function seriesForParam(
  rows: Observation[],
  parameter: string,
  days: string[]
): TrendPoint[] {
  const avg = dailyAverages(rows, parameter);
  const out: TrendPoint[] = [];
  days.forEach((day, dayIndex) => {
    const value = avg.get(day);
    if (value !== undefined) out.push({ day, dayIndex, value });
  });
  return out;
}

/** Gleitender Mittelwert über beobachtete Punkte im ±radius-Tage-Fenster */
export function smoothSeries(points: TrendPoint[], radius = 3): TrendPoint[] {
  return points.map((p) => {
    const near = points.filter((q) => Math.abs(q.dayIndex - p.dayIndex) <= radius);
    const sum = near.reduce((acc, q) => acc + q.value, 0);
    return { ...p, value: sum / near.length };
  });
}
