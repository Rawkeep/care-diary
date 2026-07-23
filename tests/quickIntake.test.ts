// Tests für die Ein-Tipp-Einnahme (Dosis laut Plan zum Zeitpunkt „jetzt").
import { describe, expect, it } from 'vitest';
import type { Medication } from '../src/db/models';
import { quickIntake } from '../src/utils/quickIntake';

function med(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'm1',
    profileId: 'p1',
    name: 'Levetiracetam',
    dose: 500,
    unit: 'mg',
    isEmergency: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Lokales Datum (mittags) → ISO, TZ-sicher für Day-Keys */
function iso(y: number, m: number, d: number): string {
  return new Date(y, m - 1, d, 12).toISOString();
}

describe('quickIntake', () => {
  it('erzeugt „genommen" mit Standarddosis und Zeitpunkt', () => {
    const at = iso(2026, 7, 23);
    const intake = quickIntake(med(), at);
    expect(intake.status).toBe('taken');
    expect(intake.amount).toBe(500);
    expect(intake.unit).toBe('mg');
    expect(intake.at).toBe(at);
    expect(intake.medicationId).toBe('m1');
    expect(intake.profileId).toBe('p1');
    expect(intake.id).toBeTruthy();
  });

  it('übernimmt die zum Zeitpunkt gültige Stufe des Dosisänderungs-Plans', () => {
    const m = med({
      doseSteps: [
        { fromDate: '2026-07-01', dose: 400 },
        { fromDate: '2026-08-01', dose: 300 },
      ],
    });
    expect(quickIntake(m, iso(2026, 6, 15)).amount).toBe(500); // vor Plan: Standarddosis
    expect(quickIntake(m, iso(2026, 7, 23)).amount).toBe(400); // Stufe 1 aktiv
    expect(quickIntake(m, iso(2026, 8, 2)).amount).toBe(300); // Stufe 2 aktiv
  });

  it('vergibt je Aufruf eine neue ID (kein Überschreiben früherer Einnahmen)', () => {
    const a = quickIntake(med(), iso(2026, 7, 23));
    const b = quickIntake(med(), iso(2026, 7, 23));
    expect(a.id).not.toBe(b.id);
  });
});
