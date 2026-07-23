// Tests für die Ausschleich-/Einschleich-Begleitung (Richtung, Prognose,
// Phasen mit Ereigniszählern).
import { describe, expect, it } from 'vitest';
import type { HealthEvent, Medication } from '../src/db/models';
import { localDayKey } from '../src/utils/date';
import { taperInfo, taperPhases } from '../src/utils/taper';

function iso(y: number, m: number, d: number, h = 12): string {
  return new Date(y, m - 1, d, h).toISOString();
}

function med(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'm1',
    profileId: 'p1',
    name: 'Levetiracetam',
    dose: 500,
    unit: 'mg',
    isEmergency: false,
    createdAt: iso(2026, 1, 1),
    doseSteps: [
      { fromDate: '2026-07-01', dose: 400 },
      { fromDate: '2026-08-01', dose: 200 },
      { fromDate: '2026-09-01', dose: 0 },
    ],
    ...overrides,
  };
}

function evt(id: string, at: string): HealthEvent {
  return { id, profileId: 'p1', type: 'tonic_clonic', startedAt: at, circumstances: [], createdAt: at };
}

const today = localDayKey(iso(2026, 7, 23));

describe('taperInfo', () => {
  it('erkennt Ausschleichen, aktuelle Stufe, nächste Stufe und Prognose', () => {
    const info = taperInfo(med(), today)!;
    expect(info.direction).toBe('down');
    expect(info.currentIndex).toBe(0);
    expect(info.currentDose).toBe(400);
    expect(info.nextDate).toBe('2026-08-01');
    expect(info.nextDose).toBe(200);
    expect(info.daysUntilNext).toBe(9);
    expect(info.endDate).toBe('2026-09-01');
    expect(info.targetDose).toBe(0);
    expect(info.reached).toBe(false);
    expect(info.daysUntilEnd).toBe(40);
  });

  it('erkennt Einschleichen und erreichtes Ziel', () => {
    const up = taperInfo(
      med({ dose: 100, doseSteps: [{ fromDate: '2026-07-01', dose: 200 }] }),
      today
    )!;
    expect(up.direction).toBe('up');
    expect(up.reached).toBe(true);
    expect(up.daysUntilEnd).toBeNull();
    expect(taperInfo(med({ doseSteps: [] }), today)).toBeNull();
  });

  it('vor der ersten Stufe gilt die Basisdosis', () => {
    const info = taperInfo(med(), localDayKey(iso(2026, 6, 15)))!;
    expect(info.currentIndex).toBe(-1);
    expect(info.currentDose).toBe(500);
  });
});

describe('taperPhases', () => {
  it('zählt Ereignisse je Stufe (laufende Stufe bis heute, zukünftige = upcoming)', () => {
    const events = [
      evt('e1', iso(2026, 7, 2)), // Stufe 1
      evt('e2', iso(2026, 7, 20)), // Stufe 1
      evt('e3', iso(2026, 6, 20)), // vor dem Plan
    ];
    const phases = taperPhases(med(), events, today);
    expect(phases).toHaveLength(3);
    expect(phases[0]).toMatchObject({ dose: 400, toDate: '2026-08-01', upcoming: false, eventCount: 2 });
    expect(phases[1]).toMatchObject({ dose: 200, upcoming: true, eventCount: 0 });
    expect(phases[2]).toMatchObject({ dose: 0, toDate: null, upcoming: true });
  });
});
