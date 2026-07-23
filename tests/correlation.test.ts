// Tests für die beschreibenden Muster-Auswertungen: Tageszeit-Verteilung,
// ereignisfreie Tage, Zustand im Vergleich, Messwert-Reihen.
import { describe, expect, it } from 'vitest';
import type { HealthEvent, Measurement, Observation } from '../src/db/models';
import {
  addDays,
  daysSinceLastEvent,
  measurementSeries,
  stateByEventProximity,
  timeOfDayHistogram,
  timeOfDaySlot,
} from '../src/utils/correlation';
import { localDayKey } from '../src/utils/date';
import { dayRange } from '../src/utils/trend';

/** Lokale Zeit → ISO (TZ-sicher für die Slot-/Day-Key-Logik) */
function iso(y: number, m: number, d: number, h = 12): string {
  return new Date(y, m - 1, d, h).toISOString();
}

function evt(id: string, at: string): HealthEvent {
  return { id, profileId: 'p1', type: 'tonic_clonic', startedAt: at, circumstances: [], createdAt: at };
}

function obs(id: string, at: string, value: Observation['value'], parameter = 'speech'): Observation {
  return { id, profileId: 'p1', parameter, value, at, createdAt: at };
}

describe('timeOfDaySlot / timeOfDayHistogram', () => {
  it('ordnet lokale Uhrzeiten den richtigen Slots zu', () => {
    expect(timeOfDaySlot(iso(2026, 7, 1, 2))).toBe('night');
    expect(timeOfDaySlot(iso(2026, 7, 1, 6))).toBe('morning');
    expect(timeOfDaySlot(iso(2026, 7, 1, 13))).toBe('afternoon');
    expect(timeOfDaySlot(iso(2026, 7, 1, 23))).toBe('evening');
  });

  it('zählt Ereignisse je Slot', () => {
    const h = timeOfDayHistogram([
      evt('e1', iso(2026, 7, 1, 3)),
      evt('e2', iso(2026, 7, 2, 4)),
      evt('e3', iso(2026, 7, 3, 19)),
    ]);
    expect(h).toEqual({ night: 2, morning: 0, afternoon: 0, evening: 1 });
  });
});

describe('daysSinceLastEvent', () => {
  const today = localDayKey(iso(2026, 7, 23));

  it('null ohne Ereignisse, 0 bei Ereignis heute, n bei n Tagen', () => {
    expect(daysSinceLastEvent([], today)).toBeNull();
    expect(daysSinceLastEvent([evt('e1', iso(2026, 7, 23, 1))], today)).toBe(0);
    expect(daysSinceLastEvent([evt('e1', iso(2026, 7, 20))], today)).toBe(3);
  });

  it('ignoriert (versehentlich) in der Zukunft dokumentierte Ereignisse', () => {
    expect(daysSinceLastEvent([evt('e1', iso(2026, 8, 1))], today)).toBeNull();
    expect(
      daysSinceLastEvent([evt('e1', iso(2026, 8, 1)), evt('e2', iso(2026, 7, 21))], today)
    ).toBe(2);
  });

  it('addDays läuft korrekt über Monatsgrenzen', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDays('2026-08-01', -1)).toBe('2026-07-31');
  });
});

describe('stateByEventProximity', () => {
  it('trennt Ereignistag + Folgetag von ereignisfreien Tagen (windowDays=1)', () => {
    const events = [evt('e1', iso(2026, 7, 10, 22))];
    const observations = [
      obs('o1', iso(2026, 7, 10), 2), // Ereignistag → near
      obs('o2', iso(2026, 7, 11), 3), // Folgetag → near
      obs('o3', iso(2026, 7, 13), 5), // frei
      obs('o4', iso(2026, 7, 20), 4), // frei
    ];
    const cmp = stateByEventProximity(observations, events, 1).get('speech');
    expect(cmp?.near).toEqual({ n: 2, avg: 2.5, min: 2, max: 3 });
    expect(cmp?.free).toEqual({ n: 2, avg: 4.5, min: 4, max: 5 });
  });

  it('liefert null für leere Gruppen und trennt Parameter', () => {
    const cmp = stateByEventProximity([obs('o1', iso(2026, 7, 1), 4, 'mood')], []);
    expect(cmp.get('mood')?.near).toBeNull();
    expect(cmp.get('mood')?.free?.n).toBe(1);
    expect(cmp.has('speech')).toBe(false);
  });
});

describe('measurementSeries', () => {
  function meas(id: string, at: string, value: number): Measurement {
    return { id, profileId: 'p1', kind: 'weight', value, unit: 'kg', at, createdAt: at };
  }

  it('mittelt je Tag und mappt auf Fenster-Indizes', () => {
    const days = dayRange(localDayKey(iso(2026, 7, 1)), localDayKey(iso(2026, 7, 5)));
    const points = measurementSeries(
      [meas('m1', iso(2026, 7, 1, 8), 41), meas('m2', iso(2026, 7, 1, 20), 43), meas('m3', iso(2026, 7, 4), 42)],
      days
    );
    expect(points).toEqual([
      { day: days[0], dayIndex: 0, value: 42 },
      { day: days[3], dayIndex: 3, value: 42 },
    ]);
  });
});
