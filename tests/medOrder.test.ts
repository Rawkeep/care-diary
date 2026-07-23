// Tests für die kontextabhängige Reihenfolge der Medikamenten-Buttons.
import { describe, expect, it } from 'vitest';
import type { Intake, Medication } from '../src/db/models';
import { localDayKey } from '../src/utils/date';
import { orderMedsForHome } from '../src/utils/medOrder';

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
    createdAt: iso(2026, 1, 1),
    ...overrides,
  };
}

function intake(id: string, medicationId: string, at: string): Intake {
  return { id, profileId: 'p1', medicationId, at, amount: 500, unit: 'mg', status: 'taken', createdAt: at };
}

const today = localDayKey(iso(2026, 7, 23));

const meds = [
  med('Erledigt', { schedule: '1-0-0' }),
  med('Notfall', { isEmergency: true }),
  med('OhneSchema'),
  med('Faellig', { schedule: '1-0-1' }),
  med('OffenSpaeter', { schedule: '0-0-1' }),
  med('Abgesetzt', { schedule: '1-0-1', endDate: '2026-01-01' }),
];
const intakes = [intake('i1', 'Erledigt', iso(2026, 7, 23, 8))];

describe('orderMedsForHome', () => {
  it('normal um 09:00: fällig > offen-später > ohne Schema > Notfall > erledigt; abgesetzte fehlen', () => {
    const order = orderMedsForHome(meds, intakes, today, '09:00', false).map((s) => s.med.name);
    expect(order).toEqual(['Faellig', 'OffenSpaeter', 'OhneSchema', 'Notfall', 'Erledigt']);
  });

  it('abends sind auch Abend-Slots fällig', () => {
    const s = orderMedsForHome(meds, intakes, today, '19:05', false);
    expect(s.find((x) => x.med.name === 'OffenSpaeter')?.due).toBe(true);
  });

  it('im Akutfall steht die Notfallmedikation ganz oben', () => {
    const order = orderMedsForHome(meds, intakes, today, '09:00', true).map((s) => s.med.name);
    expect(order[0]).toBe('Notfall');
  });

  it('Status-Flags stimmen (due/done/open)', () => {
    const byName = new Map(
      orderMedsForHome(meds, intakes, today, '09:00', false).map((s) => [s.med.name, s])
    );
    expect(byName.get('Faellig')).toMatchObject({ due: true, done: false, open: ['morgens', 'abends'] });
    expect(byName.get('OffenSpaeter')).toMatchObject({ due: false, done: false, open: ['abends'] });
    expect(byName.get('Erledigt')).toMatchObject({ due: false, done: true, open: [] });
    expect(byName.get('OhneSchema')).toMatchObject({ due: false, done: false, open: [] });
  });
});
