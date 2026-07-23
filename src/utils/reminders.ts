// Sanfte Einnahme-Erinnerungen — deterministische Aufbereitung:
// Was ist heute laut Schema noch offen, und welcher Slot ist zeitlich fällig?
// Die App erinnert, sie mahnt nicht (kein Streak-Druck, keine Wertung).
import type { Intake, Medication } from '../db/models';
import { openSlotLabels, parseSchedule, takenToday } from './schedule';

export interface OpenIntake {
  medicationId: string;
  name: string;
  openLabels: string[];
}

/** Offene Einnahme-Slots je aktivem Nicht-Notfall-Medikament mit Schema */
export function openIntakesToday(
  medications: Medication[],
  intakes: Intake[],
  todayKey: string
): OpenIntake[] {
  const out: OpenIntake[] = [];
  for (const m of medications) {
    if (m.endDate || m.isEmergency) continue;
    const plan = parseSchedule(m.schedule);
    if (!plan) continue;
    const open = openSlotLabels(plan, takenToday(intakes, m.id, todayKey));
    if (open.length > 0) out.push({ medicationId: m.id, name: m.name, openLabels: open });
  }
  return out;
}

export function totalOpenSlots(list: OpenIntake[]): number {
  return list.reduce((sum, o) => sum + o.openLabels.length, 0);
}

/** Uhrzeiten, ab denen ein Slot als „fällig" gilt (lokale Zeit, HH:MM) */
export const SLOT_TIMES: Record<string, string> = {
  morgens: '08:00',
  mittags: '13:00',
  abends: '19:00',
};

export interface DueSlot {
  label: string;
  medNames: string[];
}

/** Fällige, noch offene Slots zum Zeitpunkt hhmm (z. B. „19:05") */
export function dueOpenSlots(list: OpenIntake[], hhmm: string): DueSlot[] {
  const out: DueSlot[] = [];
  for (const [label, time] of Object.entries(SLOT_TIMES)) {
    if (hhmm < time) continue;
    const meds = list.filter((o) => o.openLabels.includes(label)).map((o) => o.name);
    if (meds.length > 0) out.push({ label, medNames: meds });
  }
  return out;
}
