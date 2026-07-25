// Medikamenten-Bestand — Reichweite ausrechnen, damit Nachschub rechtzeitig
// kommt. Zwei Zahlen tragen alles:
//   1. der **gezählte** Bestand zum Zeitpunkt `countedAt`,
//   2. der geplante Tagesverbrauch aus dem Einnahme-Rhythmus („1-0-1").
//
// Der aktuelle Stand wird aus den seither dokumentierten Einnahmen
// hochgerechnet — die App bucht nichts heimlich, sie zählt mit. Ausgelassene
// Einnahmen verbrauchen nichts, erbrochene schon (die Tablette ist weg).
//
// Das ist Vorratsrechnung, keine Dosisempfehlung: Dosis und Rhythmus kommen
// aus der ärztlichen Verordnung, die App multipliziert sie nur mit Tagen.
import type { Intake, MedStock, Medication } from '../db/models';
import { addDaysToDayKey, daysBetweenDayKeys, localDayKey } from './date';
import { parseSchedule } from './schedule';

/** Standard-Vorlauf: Rezept anfordern, Praxis, Apotheke, Wochenende */
export const DEFAULT_LEAD_DAYS = 10;

/** Ab wie wenigen Resttagen wird es unabhängig vom Vorlauf dringend? */
export const CRITICAL_DAYS = 3;

export type StockState = 'ok' | 'low' | 'critical' | 'empty' | 'unknown';

export interface StockProjection {
  /** hochgerechneter Bestand jetzt (nie negativ) */
  units: number;
  /** geplanter Tagesverbrauch in Bestands-Einheiten */
  perDay: number;
  /** verbrauchte Einheiten seit der Zählung */
  consumed: number;
  /** Reichweite in ganzen Tagen; null = ohne Rhythmus nicht hochrechenbar */
  daysLeft: number | null;
  /** voraussichtlich leer am (Day-Key); null wie daysLeft */
  emptyOn: string | null;
  state: StockState;
}

/** Geplanter Tagesverbrauch: Summe der Schema-Slots × Einheiten je Dosis */
export function dailyUnits(med: Medication, stock: MedStock): number {
  const plan = parseSchedule(med.schedule);
  if (!plan) return 0;
  const doses = plan.morning + plan.noon + plan.evening;
  return doses * (stock.unitsPerDose > 0 ? stock.unitsPerDose : 1);
}

/** Seit der Zählung dokumentierter Verbrauch (ausgelassene zählen nicht) */
export function consumedSince(stock: MedStock, intakes: Intake[]): number {
  const perDose = stock.unitsPerDose > 0 ? stock.unitsPerDose : 1;
  const count = intakes.filter(
    (i) => i.medicationId === stock.medicationId && i.status !== 'missed' && i.at > stock.countedAt
  ).length;
  return count * perDose;
}

/**
 * Aktueller Stand + Reichweite. `state`:
 * - `empty`     — aufgebraucht (nach Doku)
 * - `critical`  — höchstens CRITICAL_DAYS Tage übrig
 * - `low`       — innerhalb der Vorlaufzeit → jetzt Nachschub anstoßen
 * - `ok`        — reicht über den Vorlauf hinaus
 * - `unknown`   — kein Rhythmus hinterlegt (z. B. Bedarfsmedikation)
 */
export function projectStock(
  stock: MedStock,
  med: Medication,
  intakes: Intake[],
  nowIso: string
): StockProjection {
  const perDay = dailyUnits(med, stock);
  const consumed = consumedSince(stock, intakes);
  const units = Math.max(0, round2(stock.units - consumed));
  const lead = stock.leadDays >= 0 ? stock.leadDays : DEFAULT_LEAD_DAYS;

  if (perDay <= 0) {
    return {
      units,
      perDay,
      consumed,
      daysLeft: null,
      emptyOn: null,
      state: units <= 0 ? 'empty' : 'unknown',
    };
  }

  const daysLeft = Math.floor(units / perDay);
  const emptyOn = addDaysToDayKey(localDayKey(nowIso), daysLeft);
  const state: StockState =
    units <= 0
      ? 'empty'
      : daysLeft <= CRITICAL_DAYS
        ? 'critical'
        : daysLeft <= lead
          ? 'low'
          : 'ok';
  return { units, perDay, consumed, daysLeft, emptyOn, state };
}

/** Neue Zählung: Bestand setzen und den Verbrauchs-Nullpunkt mitnehmen */
export function recount(stock: MedStock, units: number, nowIso: string): MedStock {
  return { ...stock, units: Math.max(0, units), countedAt: nowIso, updatedAt: nowIso };
}

/** Nachschub eingetroffen: Packungsinhalt auf den hochgerechneten Stand addieren */
export function addPack(
  stock: MedStock,
  med: Medication,
  intakes: Intake[],
  packUnits: number,
  nowIso: string
): MedStock {
  const current = projectStock(stock, med, intakes, nowIso).units;
  return recount(stock, round2(current + packUnits), nowIso);
}

/** Frischer Bestands-Datensatz mit sinnvollen Vorgaben */
export function newStock(med: Medication, profileId: string, nowIso: string): MedStock {
  return {
    medicationId: med.id,
    profileId,
    units: 0,
    unitLabel: guessUnitLabel(med),
    unitsPerDose: 1,
    leadDays: DEFAULT_LEAD_DAYS,
    countedAt: nowIso,
    updatedAt: nowIso,
  };
}

/** Bestands-Einheit aus der Dosis-Einheit erraten (nur ein Vorschlag) */
export function guessUnitLabel(med: Medication): string {
  if (med.unit === 'ml' || med.unit === 'Tropfen') return med.unit;
  return 'Tabletten';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- Verfallsdatum der Packung -----------------------------------------
// Vor allem für Notfallmedikation, die lange unbenutzt bereitliegt: nichts
// ist bitterer als ein abgelaufenes Notfallmedikament im Ernstfall.

/** Wie viele Tage vorher wird an das Verfallsdatum erinnert? */
export const EXPIRY_WARN_DAYS = 30;

export interface StockExpiry {
  /** `none` = kein Datum gepflegt */
  state: 'none' | 'ok' | 'soon' | 'expired';
  /** Tage bis zum Verfall (negativ = abgelaufen) */
  daysLeft: number | null;
}

export function stockExpiry(
  stock: MedStock,
  todayKey: string,
  warnDays = EXPIRY_WARN_DAYS
): StockExpiry {
  if (!stock.expiryDate) return { state: 'none', daysLeft: null };
  const daysLeft = daysBetweenDayKeys(todayKey, stock.expiryDate);
  return { state: daysLeft < 0 ? 'expired' : daysLeft <= warnDays ? 'soon' : 'ok', daysLeft };
}

const STATE_RANK: Record<StockState, number> = { empty: 0, critical: 1, low: 2, unknown: 3, ok: 4 };

export function stockStateRank(state: StockState): number {
  return STATE_RANK[state];
}
