// Verordnungen & Fristen — deterministische Aufbereitung des Rezept-Wegs:
// gebraucht → angefragt → ausgestellt → eingelöst.
//
// Die Einlösefristen sind **Richtwerte** der jeweiligen Rezeptart, damit die
// App überhaupt rechtzeitig erinnern kann. Verbindlich ist immer der Beleg
// selbst; eine abweichende Frist lässt sich je Verordnung eintragen
// (`validDays`). Die App entscheidet nichts — sie zählt Tage.
import type { Prescription, PrescriptionKind, PrescriptionStatus } from '../db/models';
import { addDaysToDayKey, daysBetweenDayKeys } from './date';

export interface PrescriptionKindDef {
  key: PrescriptionKind;
  label: string;
  /** Regel-Einlösefrist in Tagen ab Ausstellung (Richtwert) */
  validDays: number;
  hint: string;
}

export const PRESCRIPTION_KINDS: PrescriptionKindDef[] = [
  {
    key: 'kasse',
    label: 'Kassenrezept / E-Rezept',
    validDays: 28,
    hint: 'Üblicherweise 28 Tage ab Ausstellung einlösbar.',
  },
  {
    key: 'privat',
    label: 'Privatrezept',
    validDays: 90,
    hint: 'Üblicherweise rund 3 Monate einlösbar (Erstattung ggf. kürzer).',
  },
  {
    key: 'btm',
    label: 'BtM-Rezept',
    validDays: 7,
    hint: 'Sehr kurze Frist: üblicherweise 7 Tage ab Ausstellung.',
  },
  {
    key: 'dauer',
    label: 'Dauer-/Mehrfachverordnung',
    validDays: 365,
    hint: 'Mehrfachverordnungen sind meist bis zu 365 Tage nutzbar.',
  },
  {
    key: 'hilfsmittel',
    label: 'Hilfsmittel / Therapie',
    validDays: 28,
    hint: 'Frist je Kasse und Heilmittel unterschiedlich — auf dem Beleg prüfen.',
  },
  {
    key: 'other',
    label: 'Sonstige Verordnung',
    validDays: 28,
    hint: 'Frist auf dem Beleg prüfen und bei Bedarf hier eintragen.',
  },
];

const KIND_BY_KEY: Record<string, PrescriptionKindDef> = Object.fromEntries(
  PRESCRIPTION_KINDS.map((k) => [k.key, k])
);

export function prescriptionKindDef(kind: PrescriptionKind): PrescriptionKindDef {
  return KIND_BY_KEY[kind] ?? KIND_BY_KEY.other;
}

export const PRESCRIPTION_STATUS_LABEL: Record<PrescriptionStatus, string> = {
  needed: 'gebraucht',
  requested: 'angefragt',
  issued: 'ausgestellt',
  redeemed: 'eingelöst',
};

/** Ab wie vielen Tagen Restfrist gilt ein Rezept als „bald abgelaufen"? */
export const EXPIRY_WARN_DAYS = 7;

/** Nach wie vielen Tagen ohne Antwort wird ans Nachfragen erinnert? */
export const REQUEST_FOLLOWUP_DAYS = 5;

/** Gültige Einlösefrist in Tagen — eigene Angabe schlägt die Regel */
export function validDaysOf(p: Prescription): number {
  return p.validDays != null && p.validDays > 0 ? p.validDays : prescriptionKindDef(p.kind).validDays;
}

/** Letzter Einlösetag (Day-Key); null ohne Ausstellungsdatum */
export function expiryDayKey(p: Prescription): string | null {
  if (!p.issuedDate) return null;
  return addDaysToDayKey(p.issuedDate, validDaysOf(p));
}

export type PrescriptionState =
  | 'needed'
  | 'requested'
  | 'waiting'
  | 'valid'
  | 'expiring'
  | 'expired'
  | 'redeemed'
  | 'issued_unknown';

export interface PrescriptionInfo {
  state: PrescriptionState;
  /** Resttage bis zum Ablauf der Einlösefrist (negativ = abgelaufen) */
  daysLeft: number | null;
  expiry: string | null;
  /** Tage seit der Anfrage bei der Praxis */
  waitingDays: number | null;
  /** Tage seit dem Anlegen als „gebraucht" (nur Status needed) */
  openDays: number | null;
}

/**
 * Zustand einer Verordnung zum Tag `todayKey`:
 * - `needed`/`requested`: noch kein Rezept da (`waiting` = seit Tagen ohne Antwort)
 * - `valid`/`expiring`/`expired`: Rezept liegt vor, Frist läuft
 * - `redeemed`: erledigt
 */
export function prescriptionInfo(
  p: Prescription,
  todayKey: string,
  warnDays = EXPIRY_WARN_DAYS,
  followUpDays = REQUEST_FOLLOWUP_DAYS
): PrescriptionInfo {
  const expiry = expiryDayKey(p);
  const daysLeft = expiry ? daysBetweenDayKeys(todayKey, expiry) : null;
  const waitingDays = p.requestedDate ? daysBetweenDayKeys(p.requestedDate, todayKey) : null;
  const openDays = daysBetweenDayKeys(p.createdAt.slice(0, 10), todayKey);

  const base = { daysLeft, expiry, waitingDays, openDays };
  if (p.status === 'redeemed') return { ...base, state: 'redeemed' };
  if (p.status === 'needed') return { ...base, state: 'needed', openDays };
  if (p.status === 'requested') {
    const waited = waitingDays != null && waitingDays >= followUpDays;
    return { ...base, state: waited ? 'waiting' : 'requested' };
  }
  // status === 'issued'
  if (daysLeft == null) return { ...base, state: 'issued_unknown' };
  if (daysLeft < 0) return { ...base, state: 'expired' };
  if (daysLeft <= warnDays) return { ...base, state: 'expiring' };
  return { ...base, state: 'valid' };
}

/** Offen = noch nicht eingelöst (egal in welchem Schritt) */
export function isOpen(p: Prescription): boolean {
  return p.status !== 'redeemed';
}

/** Läuft für dieses Medikament schon eine Beschaffung? (Modul-Zusammenspiel) */
export function openPrescriptionFor(
  prescriptions: Prescription[],
  medicationId: string
): Prescription | undefined {
  return prescriptions.find((p) => p.medicationId === medicationId && isOpen(p));
}

const STATE_RANK: Record<PrescriptionState, number> = {
  expired: 0,
  expiring: 1,
  waiting: 2,
  needed: 3,
  requested: 4,
  valid: 5,
  issued_unknown: 6,
  redeemed: 7,
};

/** Dringendes zuerst, Eingelöstes ans Ende; innerhalb gleicher Lage nach Titel */
export function sortPrescriptions(list: Prescription[], todayKey: string): Prescription[] {
  return [...list].sort((a, b) => {
    const ra = STATE_RANK[prescriptionInfo(a, todayKey).state];
    const rb = STATE_RANK[prescriptionInfo(b, todayKey).state];
    if (ra !== rb) return ra - rb;
    return a.title.localeCompare(b.title, 'de');
  });
}
