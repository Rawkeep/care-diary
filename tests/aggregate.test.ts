// Tests für den Aggregations-Kern — die Zähl-/Gruppierungslogik ist das
// fachliche Herz (Basis für Verlauf und spätere Arzt-Reports).
import { describe, expect, it } from 'vitest';
import type { HealthEvent, Intake, Observation } from '../src/db/models';
import {
  countEventsByType,
  groupByDay,
  itemsOfDay,
  mergeChronological,
  totalEventDurationSeconds,
} from '../src/utils/aggregate';
import { fmtDuration, localDayKey } from '../src/utils/date';

function intake(id: string, at: string): Intake {
  return {
    id, profileId: 'p1', medicationId: 'm1', at,
    amount: 500, unit: 'mg', status: 'taken', createdAt: at,
  };
}

function event(id: string, startedAt: string, type = 'tonic_clonic', durationSeconds?: number): HealthEvent {
  return { id, profileId: 'p1', type, startedAt, durationSeconds, circumstances: [], createdAt: startedAt };
}

function observation(id: string, at: string): Observation {
  return { id, profileId: 'p1', parameter: 'energy', value: 3, at, createdAt: at };
}

describe('mergeChronological', () => {
  it('mischt alle Arten und sortiert neueste zuerst', () => {
    const items = mergeChronological(
      [intake('i1', '2026-07-20T08:00:00.000Z')],
      [event('e1', '2026-07-21T14:30:00.000Z')],
      [observation('o1', '2026-07-19T20:00:00.000Z')]
    );
    expect(items.map((i) => i.kind)).toEqual(['event', 'intake', 'observation']);
  });

  it('ist stabil bei identischen Zeitstempeln', () => {
    const at = '2026-07-20T08:00:00.000Z';
    const items = mergeChronological([intake('i1', at)], [event('e1', at)], [observation('o1', at)]);
    expect(items.map((i) => i.kind)).toEqual(['event', 'intake', 'observation']);
  });
});

describe('groupByDay / itemsOfDay', () => {
  it('gruppiert nach lokalem Tag und behält die Sortierung', () => {
    const items = mergeChronological(
      [intake('i1', '2026-07-20T08:00:00.000Z'), intake('i2', '2026-07-20T19:00:00.000Z')],
      [event('e1', '2026-07-21T14:30:00.000Z')],
      []
    );
    const days = groupByDay(items);
    expect(days.size).toBe(2);
    const day20 = days.get(localDayKey('2026-07-20T08:00:00.000Z'));
    expect(day20?.map((i) => (i.ref as Intake).id)).toEqual(['i2', 'i1']);
  });

  it('filtert Einträge eines Tages', () => {
    const items = mergeChronological([intake('i1', '2026-07-20T08:00:00.000Z')], [], []);
    const key = localDayKey('2026-07-20T08:00:00.000Z');
    expect(itemsOfDay(items, key)).toHaveLength(1);
    expect(itemsOfDay(items, '1999-01-01')).toHaveLength(0);
  });
});

describe('countEventsByType / totalEventDurationSeconds', () => {
  it('zählt Ereignisse je Typ („wie oft, welche Art")', () => {
    const counts = countEventsByType([
      event('e1', '2026-07-01T00:00:00.000Z', 'absence'),
      event('e2', '2026-07-02T00:00:00.000Z', 'absence'),
      event('e3', '2026-07-03T00:00:00.000Z', 'tonic_clonic'),
    ]);
    expect(counts.get('absence')).toBe(2);
    expect(counts.get('tonic_clonic')).toBe(1);
  });

  it('summiert nur erfasste Dauern', () => {
    const total = totalEventDurationSeconds([
      event('e1', '2026-07-01T00:00:00.000Z', 'absence', 30),
      event('e2', '2026-07-02T00:00:00.000Z', 'absence'),
      event('e3', '2026-07-03T00:00:00.000Z', 'tonic_clonic', 90),
    ]);
    expect(total).toBe(120);
  });
});

describe('fmtDuration', () => {
  it('formatiert Minuten:Sekunden und Stunden', () => {
    expect(fmtDuration(0)).toBe('0:00');
    expect(fmtDuration(65)).toBe('1:05');
    expect(fmtDuration(3661)).toBe('1:01:01');
  });
});
