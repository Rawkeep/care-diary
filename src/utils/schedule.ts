// Einnahme-Tagesstatus aus dem Freitext-Schema „morgens-mittags-abends"
// (z. B. „1-0-1"). Sanfte Erinnerung ohne Push: die App zeigt, was heute
// laut Schema noch offen ist — sie mahnt nicht und wertet nicht.
import type { Intake } from '../db/models';
import { localDayKey } from './date';

export interface SchedulePlan {
  morning: number;
  noon: number;
  evening: number;
  /** Anzahl geplanter Einnahme-Zeitpunkte pro Tag (Slots mit Dosis > 0) */
  slots: number;
}

const SLOT_LABELS: [keyof Omit<SchedulePlan, 'slots'>, string][] = [
  ['morning', 'morgens'],
  ['noon', 'mittags'],
  ['evening', 'abends'],
];

/** „1-0-1" → Plan; null bei leerem/nicht parsebarem Schema */
export function parseSchedule(schedule?: string): SchedulePlan | null {
  if (!schedule) return null;
  const m = schedule
    .trim()
    .match(/^(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)$/);
  if (!m) return null;
  const num = (s: string) => Number(s.replace(',', '.'));
  const morning = num(m[1]);
  const noon = num(m[2]);
  const evening = num(m[3]);
  const slots = [morning, noon, evening].filter((v) => v > 0).length;
  if (slots === 0) return null;
  return { morning, noon, evening, slots };
}

/** Heute dokumentierte Einnahmen eines Medikaments (ausgelassene zählen nicht) */
export function takenToday(intakes: Intake[], medicationId: string, todayKey: string): number {
  return intakes.filter(
    (i) => i.medicationId === medicationId && i.status !== 'missed' && localDayKey(i.at) === todayKey
  ).length;
}

/**
 * Noch offene Slot-Labels für heute („morgens", „abends" …) — dokumentierte
 * Einnahmen füllen die Slots in Tagesreihenfolge auf.
 */
export function openSlotLabels(plan: SchedulePlan, taken: number): string[] {
  const labels = SLOT_LABELS.filter(([key]) => plan[key] > 0).map(([, label]) => label);
  return labels.slice(Math.min(taken, labels.length));
}
