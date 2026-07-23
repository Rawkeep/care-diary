// Tests für die Erinnerungs-Aufbereitung (offene Slots, Fälligkeit).
import { describe, expect, it } from 'vitest';
import type { Intake, Medication } from '../src/db/models';
import { localDayKey } from '../src/utils/date';
import { dueOpenSlots, openIntakesToday, totalOpenSlots } from '../src/utils/reminders';

function iso(y: number, m: number, d: number, h = 12): string {
  return new Date(y, m - 1, d, h).toISOString();
}

function med(id: string, overrides: Partial<Medication> = {}): Medication {
  return {
    id,
    profileId: 'p1',
    name: id,
    dose: 500,
    unit: 'mg',
    isEmergency: false,
    schedule: '1-0-1',
    createdAt: iso(2026, 1, 1),
    ...overrides,
  };
}

function intake(id: string, medicationId: string, at: string): Intake {
  return { id, profileId: 'p1', medicationId, at, amount: 500, unit: 'mg', status: 'taken', createdAt: at };
}

const today = localDayKey(iso(2026, 7, 23));

describe('openIntakesToday', () => {
  it('listet offene Slots, ignoriert Notfall-/abgesetzte/schemalose Medikamente', () => {
    const meds = [
      med('A'),
      med('B', { isEmergency: true }),
      med('C', { endDate: '2026-01-01' }),
      med('D', { schedule: 'bei Bedarf' }),
    ];
    const open = openIntakesToday(meds, [intake('i1', 'A', iso(2026, 7, 23, 8))], today);
    expect(open).toEqual([{ medicationId: 'A', name: 'A', openLabels: ['abends'] }]);
    expect(totalOpenSlots(open)).toBe(1);
  });

  it('vollständig dokumentiert ⇒ keine offenen Slots', () => {
    const rows = [intake('i1', 'A', iso(2026, 7, 23, 8)), intake('i2', 'A', iso(2026, 7, 23, 19))];
    expect(openIntakesToday([med('A')], rows, today)).toEqual([]);
  });
});

describe('dueOpenSlots', () => {
  const open = [
    { medicationId: 'A', name: 'Levetiracetam', openLabels: ['morgens', 'abends'] },
    { medicationId: 'B', name: 'Lamotrigin', openLabels: ['abends'] },
  ];

  it('meldet nur zeitlich fällige, offene Slots', () => {
    expect(dueOpenSlots(open, '07:59')).toEqual([]);
    expect(dueOpenSlots(open, '08:00')).toEqual([{ label: 'morgens', medNames: ['Levetiracetam'] }]);
    expect(dueOpenSlots(open, '19:30')).toEqual([
      { label: 'morgens', medNames: ['Levetiracetam'] },
      { label: 'abends', medNames: ['Levetiracetam', 'Lamotrigin'] },
    ]);
  });
});
