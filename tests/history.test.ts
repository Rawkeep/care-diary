// Tests für die Verlaufs-Aufbereitung: Sortierung (Tage abwärts, Tag aufwärts),
// Filter (Art/Zeitraum/Freitext), Tages-Zusammenfassung und Beschriftungen.
import { describe, expect, it } from 'vitest';
import type { HealthEvent, Intake, Observation } from '../src/db/models';
import { mergeChronological, type DiaryItem } from '../src/utils/aggregate';
import {
  ALL_ITEMS,
  KIND_RANK,
  buildDaySections,
  sortWithinDay,
  filterHistory,
  isFiltered,
  itemHaystack,
  monthLabel,
  relativeDayLabel,
  summaryText,
  type LabelContext,
} from '../src/utils/history';

/** lokale Zeit — der Verlauf gruppiert nach lokalem Tag */
const at = (y: number, mo: number, d: number, h = 12, mi = 0) =>
  new Date(y, mo - 1, d, h, mi).toISOString();

const ctx: LabelContext = {
  medName: (id) => (id === 'm1' ? 'Levetiracetam' : 'Buccolam'),
  eventLabel: (type) => (type === 'absence' ? 'Absence' : 'Tonisch-klonisch'),
  paramLabel: (key) => (key === 'sleep' ? 'Schlaf' : 'Stimmung'),
};

function intake(id: string, iso: string, over: Partial<Intake> = {}): Intake {
  return {
    id,
    profileId: 'p1',
    medicationId: 'm1',
    at: iso,
    amount: 300,
    unit: 'mg',
    status: 'taken',
    createdAt: iso,
    ...over,
  };
}

function event(id: string, iso: string, over: Partial<HealthEvent> = {}): HealthEvent {
  return {
    id,
    profileId: 'p1',
    type: 'absence',
    startedAt: iso,
    circumstances: [],
    createdAt: iso,
    ...over,
  };
}

function obs(id: string, iso: string, over: Partial<Observation> = {}): Observation {
  return {
    id,
    profileId: 'p1',
    parameter: 'sleep',
    value: 3,
    at: iso,
    createdAt: iso,
    ...over,
  };
}

describe('buildDaySections', () => {
  const items = mergeChronological(
    [intake('i-mo', at(2026, 7, 23, 8)), intake('i-ab', at(2026, 7, 23, 19))],
    [event('e-mi', at(2026, 7, 23, 14)), event('e-alt', at(2026, 7, 20, 9))],
    [obs('o-ab', at(2026, 7, 23, 19, 30)), obs('o-alt', at(2026, 6, 30, 20))]
  );

  it('Tage absteigend, innerhalb des Tages chronologisch aufsteigend', () => {
    const sections = buildDaySections(items, ctx);
    expect(sections.map((s) => s.dayKey)).toEqual(['2026-07-23', '2026-07-20', '2026-06-30']);
    expect(sections[0].items.map((i) => i.ref.id)).toEqual(['i-mo', 'e-mi', 'i-ab', 'o-ab']);
  });

  it('bei gleicher Uhrzeit entscheidet die Wichtigkeit: Ereignis → Einnahme → Zustand', () => {
    const same = at(2026, 7, 23, 8);
    const sections = buildDaySections(
      mergeChronological([intake('i', same)], [event('e', same)], [obs('o', same)]),
      ctx
    );
    expect(sections[0].items.map((i) => i.kind)).toEqual(['event', 'intake', 'observation']);
    expect(KIND_RANK.event).toBeLessThan(KIND_RANK.intake);
    expect(KIND_RANK.intake).toBeLessThan(KIND_RANK.observation);
  });

  it('sortiert unabhängig von der Eingabe-Reihenfolge', () => {
    const shuffled = [...items].reverse();
    expect(buildDaySections(shuffled, ctx)).toEqual(buildDaySections(items, ctx));
  });

  it('markiert den ersten Abschnitt je Monat (Trenner beim Scrollen)', () => {
    const sections = buildDaySections(items, ctx);
    expect(sections.map((s) => s.monthStart)).toEqual([true, false, true]);
  });

  it('leere Eingabe ⇒ keine Abschnitte', () => {
    expect(buildDaySections([], ctx)).toEqual([]);
  });

  it('sortWithinDay ist dieselbe Regel wie im Tagesabschnitt (nutzt auch „Heute")', () => {
    const oneDay = mergeChronological(
      [intake('i-mo', at(2026, 7, 23, 8)), intake('i-ab', at(2026, 7, 23, 19))],
      [event('e-mi', at(2026, 7, 23, 14))],
      [obs('o-ab', at(2026, 7, 23, 19, 30))]
    );
    expect(sortWithinDay(oneDay)).toEqual(buildDaySections(oneDay, ctx)[0].items);
    expect(sortWithinDay(oneDay).map((i) => i.ref.id)).toEqual(['i-mo', 'e-mi', 'i-ab', 'o-ab']);
    expect(sortWithinDay([])).toEqual([]);
  });
});

describe('Tages-Zusammenfassung', () => {
  it('zählt Arten, ausgelassene Einnahmen, Notizen und Ereignisarten', () => {
    const items = mergeChronological(
      [
        intake('i1', at(2026, 7, 23, 8)),
        intake('i2', at(2026, 7, 23, 19), { status: 'missed', note: 'bei Oma' }),
      ],
      [
        event('e1', at(2026, 7, 23, 3), { type: 'tonic_clonic', severity: 4 }),
        event('e2', at(2026, 7, 23, 15), { severity: 2 }),
      ],
      [obs('o1', at(2026, 7, 23, 20))]
    );
    const [day] = buildDaySections(items, ctx);
    expect(day.summary).toMatchObject({
      events: 2,
      intakes: 2,
      observations: 1,
      missedIntakes: 1,
      notes: 1,
      maxSeverity: 4,
    });
    expect(day.summary.eventLabels).toEqual(['Tonisch-klonisch', 'Absence']);
  });

  it('Zusammenfassungstext nennt nur, was da ist (korrekter Singular)', () => {
    const one = buildDaySections(
      mergeChronological([intake('i1', at(2026, 7, 23, 8))], [event('e1', at(2026, 7, 23, 9))], []),
      ctx
    )[0].summary;
    expect(summaryText(one)).toBe('1 Ereignis · 1 Einnahme');

    const many = buildDaySections(
      mergeChronological(
        [intake('i1', at(2026, 7, 23, 8)), intake('i2', at(2026, 7, 23, 19), { status: 'missed' })],
        [],
        [obs('o1', at(2026, 7, 23, 20)), obs('o2', at(2026, 7, 23, 21))]
      ),
      ctx
    )[0].summary;
    expect(summaryText(many)).toBe('2 Einnahmen (1 ausgelassen) · 2× Zustand');
  });
});

describe('filterHistory', () => {
  const items = mergeChronological(
    [intake('i1', at(2026, 7, 23, 8)), intake('i2', at(2026, 6, 1, 8), { note: 'bei Oma vergessen' })],
    [event('e1', at(2026, 7, 22, 3), { circumstances: ['Fieber / Infekt'] })],
    [obs('o1', at(2026, 7, 21, 20), { note: 'Sehr unruhig' })]
  );

  it('ohne Filter bleibt alles', () => {
    expect(filterHistory(items, ALL_ITEMS, ctx)).toHaveLength(4);
    expect(isFiltered(ALL_ITEMS)).toBe(false);
  });

  it('Art', () => {
    expect(filterHistory(items, { ...ALL_ITEMS, kind: 'event' }, ctx).map((i) => i.ref.id)).toEqual(['e1']);
    expect(filterHistory(items, { ...ALL_ITEMS, kind: 'intake' }, ctx)).toHaveLength(2);
  });

  it('Zeitraum (inklusiv an beiden Rändern)', () => {
    const r = { from: '2026-07-21', to: '2026-07-22' };
    expect(filterHistory(items, { ...ALL_ITEMS, range: r }, ctx).map((i) => i.ref.id).sort()).toEqual([
      'e1',
      'o1',
    ]);
    expect(
      filterHistory(items, { ...ALL_ITEMS, range: { from: '2026-07-23', to: '2026-07-23' } }, ctx)
    ).toHaveLength(1);
  });

  it('Freitext über Notiz, Bezeichnung und Begleitumstände (Groß/Klein egal)', () => {
    const q = (query: string) => filterHistory(items, { ...ALL_ITEMS, query }, ctx).map((i) => i.ref.id);
    expect(q('oma')).toEqual(['i2']);
    expect(q('UNRUHIG')).toEqual(['o1']);
    expect(q('fieber')).toEqual(['e1']);
    expect(q('levetiracetam').sort()).toEqual(['i1', 'i2']);
    expect(q('  ')).toHaveLength(4); // nur Leerzeichen = kein Filter
    expect(q('gibtesnicht')).toEqual([]);
  });

  it('Filter greifen zusammen', () => {
    const out = filterHistory(
      items,
      { kind: 'intake', query: 'oma', range: { from: '2026-06-01', to: '2026-06-30' } },
      ctx
    );
    expect(out.map((i) => i.ref.id)).toEqual(['i2']);
    expect(isFiltered({ kind: 'intake', query: '', range: null })).toBe(true);
  });
});

describe('Beschriftungen', () => {
  it('relative Tagesnamen bis Vorgestern, danach Wochentag + Datum', () => {
    const today = '2026-07-23';
    expect(relativeDayLabel('2026-07-23', today)).toBe('Heute');
    expect(relativeDayLabel('2026-07-22', today)).toBe('Gestern');
    expect(relativeDayLabel('2026-07-21', today)).toBe('Vorgestern');
    expect(relativeDayLabel('2026-07-20', today)).toBe('Mo., 20.07.2026');
    // über Monats-/Jahresgrenze: relative Namen gelten genauso
    expect(relativeDayLabel('2026-01-01', '2026-01-02')).toBe('Gestern');
    expect(relativeDayLabel('2025-12-31', '2026-01-02')).toBe('Vorgestern');
    expect(relativeDayLabel('2025-12-30', '2026-01-02')).toBe('Di., 30.12.2025');
  });

  it('Monatstrenner deutsch', () => {
    expect(monthLabel('2026-07-23')).toBe('Juli 2026');
    expect(monthLabel('2026-03-01')).toBe('März 2026');
    expect(monthLabel('2025-12-24')).toBe('Dezember 2025');
  });
});

describe('itemHaystack', () => {
  it('bündelt Bezeichnung, Notiz und Umstände je Art', () => {
    const i: DiaryItem = { kind: 'intake', at: at(2026, 7, 23), ref: intake('i', at(2026, 7, 23), { note: 'mit Joghurt' }) };
    expect(itemHaystack(i, ctx)).toContain('Levetiracetam');
    expect(itemHaystack(i, ctx)).toContain('mit Joghurt');
    const e: DiaryItem = {
      kind: 'event',
      at: at(2026, 7, 23),
      ref: event('e', at(2026, 7, 23), { circumstances: ['Schlafmangel'], note: 'kurz' }),
    };
    expect(itemHaystack(e, ctx)).toBe('Absence Schlafmangel kurz');
    const o: DiaryItem = { kind: 'observation', at: at(2026, 7, 23), ref: obs('o', at(2026, 7, 23)) };
    expect(itemHaystack(o, ctx)).toBe('Schlaf');
  });
});
