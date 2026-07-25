// Tests für die Bestands-Hochrechnung: Tagesverbrauch aus dem Rhythmus,
// Verbrauch aus dokumentierten Einnahmen, Reichweite und Verfallsdatum.
import { describe, expect, it } from 'vitest';
import type { Intake, MedStock, Medication } from '../src/db/models';
import {
  CRITICAL_DAYS,
  addPack,
  consumedSince,
  dailyUnits,
  guessUnitLabel,
  newStock,
  projectStock,
  recount,
  stockExpiry,
} from '../src/utils/stock';

const NOW = '2026-07-23T18:00:00.000Z';
const TODAY = '2026-07-23';
const COUNTED = '2026-07-20T08:00:00.000Z';

function med(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'm1',
    profileId: 'p1',
    name: 'Levetiracetam',
    dose: 500,
    unit: 'mg',
    schedule: '1-0-1',
    isEmergency: false,
    createdAt: COUNTED,
    ...overrides,
  };
}

function stock(overrides: Partial<MedStock> = {}): MedStock {
  return {
    medicationId: 'm1',
    profileId: 'p1',
    units: 60,
    unitLabel: 'Tabletten',
    unitsPerDose: 1,
    leadDays: 10,
    countedAt: COUNTED,
    updatedAt: COUNTED,
    ...overrides,
  };
}

function intake(at: string, overrides: Partial<Intake> = {}): Intake {
  return {
    id: `i-${at}`,
    profileId: 'p1',
    medicationId: 'm1',
    at,
    amount: 500,
    unit: 'mg',
    status: 'taken',
    createdAt: at,
    ...overrides,
  };
}

describe('dailyUnits', () => {
  it('Summe der Schema-Slots × Einheiten je Dosis', () => {
    expect(dailyUnits(med({ schedule: '1-0-1' }), stock())).toBe(2);
    expect(dailyUnits(med({ schedule: '1-1-1' }), stock())).toBe(3);
    expect(dailyUnits(med({ schedule: '1-0-1' }), stock({ unitsPerDose: 0.5 }))).toBe(1);
    expect(dailyUnits(med({ schedule: '0,5-0-1' }), stock())).toBe(1.5);
  });

  it('ohne Rhythmus kein Tagesverbrauch (z. B. Bedarfsmedikation)', () => {
    expect(dailyUnits(med({ schedule: undefined }), stock())).toBe(0);
    expect(dailyUnits(med({ schedule: 'bei Bedarf' }), stock())).toBe(0);
  });
});

describe('consumedSince', () => {
  const rows = [
    intake('2026-07-19T19:00:00.000Z'), // vor der Zählung ⇒ zählt nicht
    intake('2026-07-20T19:00:00.000Z'),
    intake('2026-07-21T08:00:00.000Z', { status: 'missed' }), // nicht genommen
    intake('2026-07-21T19:00:00.000Z', { status: 'late' }),
    intake('2026-07-22T08:00:00.000Z', { status: 'vomited' }), // Tablette ist weg
    intake('2026-07-22T08:05:00.000Z', { medicationId: 'anderes' }), // andere Packung
  ];

  it('zählt nur eigene Einnahmen nach der Zählung, ausgelassene nicht', () => {
    expect(consumedSince(stock(), rows)).toBe(3);
  });

  it('berücksichtigt Teildosen', () => {
    expect(consumedSince(stock({ unitsPerDose: 0.5 }), rows)).toBe(1.5);
  });
});

describe('projectStock', () => {
  it('rechnet Bestand und Reichweite aus Zählung + Einnahmen hoch', () => {
    const rows = [intake('2026-07-20T19:00:00.000Z'), intake('2026-07-21T08:00:00.000Z')];
    const p = projectStock(stock(), med(), rows, NOW);
    expect(p.consumed).toBe(2);
    expect(p.units).toBe(58);
    expect(p.perDay).toBe(2);
    expect(p.daysLeft).toBe(29);
    expect(p.state).toBe('ok');
    expect(p.emptyOn).toBe('2026-08-21');
  });

  it('innerhalb der Vorlaufzeit ⇒ „low", knapp davor ⇒ „critical"', () => {
    expect(projectStock(stock({ units: 40 }), med(), [], NOW).state).toBe('ok');
    expect(projectStock(stock({ units: 20 }), med(), [], NOW).state).toBe('low');
    expect(projectStock(stock({ units: 6 }), med(), [], NOW).state).toBe('critical');
    expect(projectStock(stock({ units: 2 * CRITICAL_DAYS }), med(), [], NOW).daysLeft).toBe(
      CRITICAL_DAYS
    );
  });

  it('aufgebraucht ⇒ „empty", nie negativer Bestand', () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      intake(`2026-07-2${1 + i}T08:00:00.000Z`)
    );
    const p = projectStock(stock({ units: 3 }), med(), rows, NOW);
    expect(p.units).toBe(0);
    expect(p.state).toBe('empty');
  });

  it('ohne Rhythmus: Reichweite unbekannt, aber leer bleibt leer', () => {
    const bedarf = med({ schedule: undefined, isEmergency: true });
    const p = projectStock(stock({ units: 2 }), bedarf, [], NOW);
    expect(p.daysLeft).toBeNull();
    expect(p.emptyOn).toBeNull();
    expect(p.state).toBe('unknown');
    expect(projectStock(stock({ units: 0 }), bedarf, [], NOW).state).toBe('empty');
  });

  it('Teildosen: halbe Tabletten reichen doppelt so lang', () => {
    const p = projectStock(stock({ units: 30, unitsPerDose: 0.5 }), med(), [], NOW);
    expect(p.perDay).toBe(1);
    expect(p.daysLeft).toBe(30);
  });
});

describe('Zählen und Nachfüllen', () => {
  it('recount setzt den Verbrauchs-Nullpunkt neu', () => {
    const s = recount(stock(), 42, NOW);
    expect(s.units).toBe(42);
    expect(s.countedAt).toBe(NOW);
    expect(consumedSince(s, [intake('2026-07-21T08:00:00.000Z')])).toBe(0);
  });

  it('addPack addiert auf den hochgerechneten Stand, nicht auf die alte Zählung', () => {
    const rows = [intake('2026-07-20T19:00:00.000Z'), intake('2026-07-21T08:00:00.000Z')];
    const s = addPack(stock({ units: 10 }), med(), rows, 100, NOW);
    expect(s.units).toBe(108); // 10 − 2 + 100
    expect(projectStock(s, med(), rows, NOW).units).toBe(108); // nicht doppelt abgezogen
  });

  it('newStock: sinnvolle Vorgaben, Einheit aus der Dosis-Einheit geraten', () => {
    const s = newStock(med(), 'p1', NOW);
    expect(s).toMatchObject({ medicationId: 'm1', units: 0, unitsPerDose: 1, unitLabel: 'Tabletten' });
    expect(guessUnitLabel(med({ unit: 'ml' }))).toBe('ml');
    expect(guessUnitLabel(med({ unit: 'Tropfen' }))).toBe('Tropfen');
  });
});

describe('stockExpiry', () => {
  it('kein Datum ⇒ keine Meldung', () => {
    expect(stockExpiry(stock(), TODAY).state).toBe('none');
  });

  it('abgelaufen, bald, in Ordnung', () => {
    expect(stockExpiry(stock({ expiryDate: '2026-07-22' }), TODAY).state).toBe('expired');
    expect(stockExpiry(stock({ expiryDate: '2026-07-23' }), TODAY)).toEqual({
      state: 'soon',
      daysLeft: 0,
    });
    expect(stockExpiry(stock({ expiryDate: '2026-08-10' }), TODAY).state).toBe('soon');
    expect(stockExpiry(stock({ expiryDate: '2027-01-01' }), TODAY).state).toBe('ok');
  });
});
