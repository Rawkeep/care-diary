// Ein-Tipp-Einnahme: „jetzt genommen, Dosis laut Plan" — für gestresste
// Alltagssituationen. Ein Tipp erzeugt einen vollständigen Intake-Datensatz;
// Korrekturen laufen über den Rückgängig-Toast bzw. das Detail-Formular.
import type { Intake, Medication } from '../db/models';
import { newId, nowIso } from '../db/models';
import { effectiveDose } from './dose';

export function quickIntake(med: Medication, at: string = nowIso()): Intake {
  return {
    id: newId(),
    profileId: med.profileId,
    medicationId: med.id,
    at,
    amount: effectiveDose(med, at),
    unit: med.unit,
    status: 'taken',
    createdAt: at,
  };
}
