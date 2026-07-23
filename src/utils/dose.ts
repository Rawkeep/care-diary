// Wirksame Dosis laut dokumentiertem Dosisänderungs-Plan (z. B. stufenweises
// Herabsetzen). Reine Nachschlage-Logik: die App rechnet keine Pläne aus,
// sie bildet die ärztliche Verordnung ab und zeigt die aktuell gültige Stufe.
import type { Medication } from '../db/models';
import { localDayKey } from './date';

export function effectiveDose(med: Medication, atIso: string): number {
  const day = localDayKey(atIso);
  const steps = [...(med.doseSteps ?? [])].sort((a, b) => a.fromDate.localeCompare(b.fromDate));
  let dose = med.dose;
  for (const step of steps) {
    if (step.fromDate <= day) dose = step.dose;
    else break;
  }
  return dose;
}
