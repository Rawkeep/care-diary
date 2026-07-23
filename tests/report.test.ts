// Tests für Report-Aggregationen und den Dosisänderungs-Plan.
// Zeitstempel werden aus lokalen Datumsangaben erzeugt (mittags), damit die
// Day-Key-Zuordnung unabhängig von der Zeitzone des Testrechners stimmt.
import { describe, expect, it } from 'vitest';
import type { HealthEvent, Intake, Medication, Observation } from '../src/db/models';
import {
  eventCountByDay,
  inDayRange,
  intakeStatusByMedication,
  monthsBetween,
  observationStats,
} from '../src/utils/aggregate';
import { effectiveDose } from '../src/utils/dose';
import { localDayKey } from '../src/utils/date';

/** Lokales Datum (mittags) → ISO-Zeitstempel, TZ-sicher für Day-Keys */
function iso(y: number, m: number, d: number): string {
  return new Date(y, m - 1, d, 12).toISOString();
}

function event(id: string, startedAt: string): HealthEvent {
  return { id, profileId: 'p1', type: 'absence', startedAt, circumstances: [], createdAt: startedAt };
}

function intake(id: string, at: string, status: Intake['status']): Intake {
  return { id, profileId: 'p1', medicationId: 'm1', at, amount: 500, unit: 'mg', status, createdAt: at };
}

function obs(id: string, at: string, parameter: string, value: Observation['value']): Observation {
  return { id, profileId: 'p1', parameter, value, at, createdAt: at };
}

function med(doseSteps?: Medication['doseSteps']): Medication {
  return {
    id: 'm1', profileId: 'p1', name: 'Levetiracetam', dose: 500, unit: 'mg',
    isEmergency: false, doseSteps, createdAt: iso(2026, 1, 1),
  };
}

describe('inDayRange', () => {
  it('filtert inklusiv auf Day-Key-Grenzen', () => {
    const rows = [event('e1', iso(2026, 7, 1)), event('e2', iso(2026, 7, 15)), event('e3', iso(2026, 8, 1))];
    const from = localDayKey(iso(2026, 7, 1));
    const to = localDayKey(iso(2026, 7, 31));
    const hit = inDayRange(rows, (e) => e.startedAt, from, to);
    expect(hit.map((e) => e.id)).toEqual(['e1', 'e2']);
  });
});

describe('eventCountByDay', () => {
  it('zählt Ereignisse je Tag (Anfallskalender-Basis)', () => {
    const counts = eventCountByDay([
      event('e1', iso(2026, 7, 3)),
      event('e2', iso(2026, 7, 3)),
      event('e3', iso(2026, 7, 5)),
    ]);
    expect(counts.get(localDayKey(iso(2026, 7, 3)))).toBe(2);
    expect(counts.get(localDayKey(iso(2026, 7, 5)))).toBe(1);
    expect(counts.get(localDayKey(iso(2026, 7, 4)))).toBeUndefined();
  });
});

describe('intakeStatusByMedication', () => {
  it('zählt Einnahme-Status je Medikament', () => {
    const rec = intakeStatusByMedication([
      intake('i1', iso(2026, 7, 1), 'taken'),
      intake('i2', iso(2026, 7, 2), 'taken'),
      intake('i3', iso(2026, 7, 3), 'missed'),
    ]).get('m1');
    expect(rec).toEqual({ taken: 2, missed: 1, late: 0, vomited: 0 });
  });
});

describe('observationStats', () => {
  it('liefert n/avg/min/max je Parameter', () => {
    const stats = observationStats([
      obs('o1', iso(2026, 7, 1), 'energy', 2),
      obs('o2', iso(2026, 7, 2), 'energy', 4),
      obs('o3', iso(2026, 7, 3), 'mood', 5),
    ]);
    expect(stats.get('energy')).toEqual({ n: 2, avg: 3, min: 2, max: 4 });
    expect(stats.get('mood')).toEqual({ n: 1, avg: 5, min: 5, max: 5 });
  });
});

describe('monthsBetween', () => {
  it('liefert alle Monate inklusive der Ränder', () => {
    expect(monthsBetween('2026-05-15', '2026-07-01')).toEqual([
      { year: 2026, month: 4 },
      { year: 2026, month: 5 },
      { year: 2026, month: 6 },
    ]);
  });

  it('überschreitet Jahresgrenzen korrekt', () => {
    expect(monthsBetween('2025-11-30', '2026-02-01')).toEqual([
      { year: 2025, month: 10 },
      { year: 2025, month: 11 },
      { year: 2026, month: 0 },
      { year: 2026, month: 1 },
    ]);
  });
});

describe('effectiveDose (stufenweises Herabsetzen)', () => {
  it('ohne Plan gilt die Basisdosis', () => {
    expect(effectiveDose(med(), iso(2026, 7, 20))).toBe(500);
  });

  it('vor der ersten Stufe gilt die Basisdosis, danach die jeweilige Stufe', () => {
    const m = med([
      { fromDate: localDayKey(iso(2026, 7, 10)), dose: 375 },
      { fromDate: localDayKey(iso(2026, 7, 24)), dose: 250 },
    ]);
    expect(effectiveDose(m, iso(2026, 7, 5))).toBe(500);
    expect(effectiveDose(m, iso(2026, 7, 10))).toBe(375); // Stufenstart inklusiv
    expect(effectiveDose(m, iso(2026, 7, 23))).toBe(375);
    expect(effectiveDose(m, iso(2026, 8, 1))).toBe(250);
  });

  it('sortiert unsortierte Stufen selbst', () => {
    const m = med([
      { fromDate: localDayKey(iso(2026, 7, 24)), dose: 250 },
      { fromDate: localDayKey(iso(2026, 7, 10)), dose: 375 },
    ]);
    expect(effectiveDose(m, iso(2026, 7, 15))).toBe(375);
  });
});
