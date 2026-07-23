// Tests für die Zustands-Verlauf-Aufbereitung (Tages-Ø, Fenster, Glättung).
import { describe, expect, it } from 'vitest';
import type { Observation } from '../src/db/models';
import { localDayKey } from '../src/utils/date';
import { dailyAverages, dayRange, seriesForParam, smoothSeries } from '../src/utils/trend';

/** Lokales Datum (mittags) → ISO, TZ-sicher für Day-Keys */
function iso(y: number, m: number, d: number): string {
  return new Date(y, m - 1, d, 12).toISOString();
}

function obs(id: string, at: string, value: Observation['value'], parameter = 'energy'): Observation {
  return { id, profileId: 'p1', parameter, value, at, createdAt: at };
}

describe('dayRange', () => {
  it('liefert alle Tage inklusive der Ränder', () => {
    const days = dayRange(localDayKey(iso(2026, 7, 29)), localDayKey(iso(2026, 8, 2)));
    expect(days).toEqual(['2026-07-29', '2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02']);
  });
});

describe('dailyAverages', () => {
  it('mittelt mehrere Werte desselben Tages', () => {
    const avg = dailyAverages(
      [obs('o1', iso(2026, 7, 1), 2), obs('o2', iso(2026, 7, 1), 4), obs('o3', iso(2026, 7, 2), 5)],
      'energy'
    );
    expect(avg.get('2026-07-01')).toBe(3);
    expect(avg.get('2026-07-02')).toBe(5);
  });

  it('ignoriert andere Parameter', () => {
    const avg = dailyAverages([obs('o1', iso(2026, 7, 1), 2, 'mood')], 'energy');
    expect(avg.size).toBe(0);
  });
});

describe('seriesForParam', () => {
  it('erzeugt nur Punkte für Tage mit Daten, mit korrektem Fenster-Index', () => {
    const days = dayRange('2026-07-01', '2026-07-05');
    const points = seriesForParam(
      [obs('o1', iso(2026, 7, 2), 3), obs('o2', iso(2026, 7, 5), 4)],
      'energy',
      days
    );
    expect(points).toEqual([
      { day: '2026-07-02', dayIndex: 1, value: 3 },
      { day: '2026-07-05', dayIndex: 4, value: 4 },
    ]);
  });
});

describe('smoothSeries', () => {
  it('glättet über Punkte im ±radius-Fenster', () => {
    const points = [
      { day: '2026-07-01', dayIndex: 0, value: 1 },
      { day: '2026-07-02', dayIndex: 1, value: 5 },
      { day: '2026-07-03', dayIndex: 2, value: 3 },
    ];
    const smoothed = smoothSeries(points, 1);
    expect(smoothed[0].value).toBe(3); // (1+5)/2
    expect(smoothed[1].value).toBe(3); // (1+5+3)/3
    expect(smoothed[2].value).toBe(4); // (5+3)/2
  });

  it('lässt weit auseinanderliegende Punkte unverändert', () => {
    const points = [
      { day: '2026-07-01', dayIndex: 0, value: 2 },
      { day: '2026-07-20', dayIndex: 19, value: 4 },
    ];
    const smoothed = smoothSeries(points, 3);
    expect(smoothed.map((p) => p.value)).toEqual([2, 4]);
  });
});
