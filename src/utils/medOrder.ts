// Kontextabhängige Ordnung der Ein-Tipp-Medikamenten-Buttons auf „Heute":
// Der Knopf, der JETZT gebraucht wird, steht oben — bei stabilen Zonen
// (Akut-Button und Schnell-Raster wandern nie, nur die Med-Liste sortiert).
// Rangfolge normal:      fällig > offen > ohne Schema > Notfall > erledigt
// Rangfolge im Akutfall: Notfall zuerst (genau dann wird sie gebraucht).
import type { Intake, Medication } from '../db/models';
import { SLOT_TIMES } from './reminders';
import { openSlotLabels, parseSchedule, takenToday } from './schedule';

export interface MedHomeStatus {
  med: Medication;
  /** offene Slot-Labels laut Schema (leer ohne Schema) */
  open: string[];
  /** mindestens ein offener Slot ist zeitlich fällig */
  due: boolean;
  /** Schema vorhanden und heute vollständig dokumentiert */
  done: boolean;
}

function rank(s: MedHomeStatus, acuteRunning: boolean): number {
  if (s.med.isEmergency) return acuteRunning ? 0 : 3;
  if (s.done) return 4;
  if (s.due) return acuteRunning ? 1 : 0;
  if (s.open.length > 0) return acuteRunning ? 2 : 1;
  return acuteRunning ? 3 : 2;
}

/** Aktive Medikamente in Anzeige-Reihenfolge mit Tagesstatus */
export function orderMedsForHome(
  medications: Medication[],
  intakes: Intake[],
  todayKey: string,
  hhmm: string,
  acuteRunning: boolean
): MedHomeStatus[] {
  const statuses: MedHomeStatus[] = medications
    .filter((m) => !m.endDate)
    .map((med) => {
      const plan = med.isEmergency ? null : parseSchedule(med.schedule);
      const open = plan ? openSlotLabels(plan, takenToday(intakes, med.id, todayKey)) : [];
      return {
        med,
        open,
        due: open.some((label) => hhmm >= (SLOT_TIMES[label] ?? '99:99')),
        done: Boolean(plan) && open.length === 0,
      };
    });
  // stabile Sortierung: innerhalb gleichen Rangs bleibt die Anlage-Reihenfolge
  return statuses.sort((a, b) => rank(a, acuteRunning) - rank(b, acuteRunning));
}
