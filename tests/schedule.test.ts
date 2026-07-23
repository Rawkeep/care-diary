// Tests für den Einnahme-Tagesstatus (Schema-Parsing + offene Slots).
import { describe, expect, it } from 'vitest';
import type { Intake } from '../src/db/models';
import { localDayKey } from '../src/utils/date';
import { formatSchedule, openSlotLabels, parseSchedule, takenToday } from '../src/utils/schedule';

function iso(y: number, m: number, d: number, h = 12): string {
  return new Date(y, m - 1, d, h).toISOString();
}

function intake(id: string, medicationId: string, at: string, status: Intake['status'] = 'taken'): Intake {
  return { id, profileId: 'p1', medicationId, at, amount: 500, unit: 'mg', status, createdAt: at };
}

describe('parseSchedule', () => {
  it('parst „1-0-1" (auch mit Leerzeichen und Kommadosen)', () => {
    expect(parseSchedule('1-0-1')).toEqual({ morning: 1, noon: 0, evening: 1, slots: 2 });
    expect(parseSchedule(' 1 - 1 - 1 ')).toEqual({ morning: 1, noon: 1, evening: 1, slots: 3 });
    expect(parseSchedule('0,5-0-0,5')).toEqual({ morning: 0.5, noon: 0, evening: 0.5, slots: 2 });
  });

  it('liefert null für leere, freie oder nur-Null-Schemata', () => {
    expect(parseSchedule(undefined)).toBeNull();
    expect(parseSchedule('bei Bedarf')).toBeNull();
    expect(parseSchedule('0-0-0')).toBeNull();
  });

  it('formatSchedule ⇄ parseSchedule ist ein Roundtrip (inkl. halber Dosen)', () => {
    expect(formatSchedule({ morning: 1, noon: 0, evening: 1 })).toBe('1-0-1');
    expect(formatSchedule({ morning: 0.5, noon: 0, evening: 1.5 })).toBe('0,5-0-1,5');
    const plan = parseSchedule(formatSchedule({ morning: 0.5, noon: 0, evening: 1.5 }))!;
    expect(plan).toMatchObject({ morning: 0.5, noon: 0, evening: 1.5, slots: 2 });
  });
});

describe('takenToday / openSlotLabels', () => {
  const today = localDayKey(iso(2026, 7, 23));

  it('zählt nur heutige, nicht ausgelassene Einnahmen des Medikaments', () => {
    const rows = [
      intake('i1', 'm1', iso(2026, 7, 23, 8)),
      intake('i2', 'm1', iso(2026, 7, 22, 8)), // gestern
      intake('i3', 'm1', iso(2026, 7, 23, 12), 'missed'), // ausgelassen
      intake('i4', 'm2', iso(2026, 7, 23, 8)), // anderes Medikament
    ];
    expect(takenToday(rows, 'm1', today)).toBe(1);
  });

  it('füllt Slots in Tagesreihenfolge auf', () => {
    const plan = parseSchedule('1-0-1')!;
    expect(openSlotLabels(plan, 0)).toEqual(['morgens', 'abends']);
    expect(openSlotLabels(plan, 1)).toEqual(['abends']);
    expect(openSlotLabels(plan, 2)).toEqual([]);
    expect(openSlotLabels(plan, 5)).toEqual([]); // Bedarfs-Extradosen kippen nichts
  });
});
