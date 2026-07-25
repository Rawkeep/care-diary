// Tests für Verordnungs-Fristen: Regel-Fristen je Rezeptart, eigene Frist,
// Status-Kette und Sortierung nach Dringlichkeit.
import { describe, expect, it } from 'vitest';
import type { Prescription } from '../src/db/models';
import {
  EXPIRY_WARN_DAYS,
  expiryDayKey,
  openPrescriptionFor,
  prescriptionInfo,
  prescriptionKindDef,
  sortPrescriptions,
  validDaysOf,
} from '../src/utils/prescription';

const TODAY = '2026-07-23';

function rx(overrides: Partial<Prescription> = {}): Prescription {
  return {
    id: 'rx1',
    profileId: 'p1',
    title: 'Levetiracetam 500 mg N3',
    kind: 'kasse',
    status: 'issued',
    createdAt: '2026-07-01T09:00:00.000Z',
    updatedAt: '2026-07-01T09:00:00.000Z',
    ...overrides,
  };
}

describe('Fristen je Rezeptart', () => {
  it('Regel-Fristen: Kasse 28, BtM 7, Privat 90, Dauer 365 Tage', () => {
    expect(prescriptionKindDef('kasse').validDays).toBe(28);
    expect(prescriptionKindDef('btm').validDays).toBe(7);
    expect(prescriptionKindDef('privat').validDays).toBe(90);
    expect(prescriptionKindDef('dauer').validDays).toBe(365);
  });

  it('eigene Frist auf dem Beleg schlägt die Regel', () => {
    expect(validDaysOf(rx({ kind: 'kasse' }))).toBe(28);
    expect(validDaysOf(rx({ kind: 'kasse', validDays: 14 }))).toBe(14);
    // 0/negativ ist keine Angabe, sondern ein Tippfehler ⇒ Regel greift
    expect(validDaysOf(rx({ kind: 'btm', validDays: 0 }))).toBe(7);
  });

  it('Ablaufdatum = Ausstellung + Frist; ohne Ausstellung kein Datum', () => {
    expect(expiryDayKey(rx({ issuedDate: '2026-07-20' }))).toBe('2026-08-17');
    expect(expiryDayKey(rx({ issuedDate: '2026-07-20', kind: 'btm' }))).toBe('2026-07-27');
    expect(expiryDayKey(rx({ issuedDate: undefined }))).toBeNull();
  });

  it('rechnet über Monats- und Jahresgrenzen', () => {
    expect(expiryDayKey(rx({ issuedDate: '2026-12-20' }))).toBe('2027-01-17');
  });
});

describe('prescriptionInfo', () => {
  it('gebraucht: zählt die Tage seit dem Anlegen', () => {
    const info = prescriptionInfo(rx({ status: 'needed' }), TODAY);
    expect(info.state).toBe('needed');
    expect(info.openDays).toBe(22);
    expect(info.daysLeft).toBeNull();
  });

  it('angefragt: erst nach der Nachfrage-Frist „waiting"', () => {
    expect(prescriptionInfo(rx({ status: 'requested', requestedDate: '2026-07-21' }), TODAY).state).toBe(
      'requested'
    );
    const waiting = prescriptionInfo(rx({ status: 'requested', requestedDate: '2026-07-15' }), TODAY);
    expect(waiting.state).toBe('waiting');
    expect(waiting.waitingDays).toBe(8);
  });

  it('ausgestellt: gültig → bald ablaufend → abgelaufen', () => {
    // 28-Tage-Rezept vom 22.07. ⇒ 27 Tage Restfrist
    expect(prescriptionInfo(rx({ issuedDate: '2026-07-22' }), TODAY).state).toBe('valid');
    const expiring = prescriptionInfo(rx({ issuedDate: '2026-07-01' }), TODAY);
    expect(expiring.state).toBe('expiring');
    expect(expiring.daysLeft).toBe(6);
    expect(expiring.daysLeft!).toBeLessThanOrEqual(EXPIRY_WARN_DAYS);
    const expired = prescriptionInfo(rx({ issuedDate: '2026-06-01' }), TODAY);
    expect(expired.state).toBe('expired');
    expect(expired.daysLeft).toBeLessThan(0);
  });

  it('letzter Einlösetag zählt noch als gültig, der Tag danach nicht mehr', () => {
    // Ausstellung 25.06. + 28 Tage = 23.07. = heute
    expect(prescriptionInfo(rx({ issuedDate: '2026-06-25' }), TODAY).daysLeft).toBe(0);
    expect(prescriptionInfo(rx({ issuedDate: '2026-06-25' }), TODAY).state).toBe('expiring');
    expect(prescriptionInfo(rx({ issuedDate: '2026-06-24' }), TODAY).state).toBe('expired');
  });

  it('ausgestellt ohne Datum ⇒ keine Frist berechenbar (kein Fehlalarm)', () => {
    expect(prescriptionInfo(rx({ status: 'issued', issuedDate: undefined }), TODAY).state).toBe(
      'issued_unknown'
    );
  });

  it('eingelöst ist immer erledigt — auch bei alter Frist', () => {
    expect(
      prescriptionInfo(rx({ status: 'redeemed', issuedDate: '2026-01-01' }), TODAY).state
    ).toBe('redeemed');
  });
});

describe('Sortierung und Modul-Zusammenspiel', () => {
  it('Dringendes oben, Eingelöstes unten', () => {
    const list = [
      rx({ id: 'valid', title: 'B', issuedDate: '2026-07-22' }),
      rx({ id: 'redeemed', title: 'A', status: 'redeemed' }),
      rx({ id: 'expired', title: 'C', issuedDate: '2026-06-01' }),
      rx({ id: 'needed', title: 'D', status: 'needed' }),
    ];
    expect(sortPrescriptions(list, TODAY).map((p) => p.id)).toEqual([
      'expired',
      'needed',
      'valid',
      'redeemed',
    ]);
  });

  it('findet die laufende Beschaffung zu einem Medikament (nicht die erledigte)', () => {
    const list = [
      rx({ id: 'alt', medicationId: 'm1', status: 'redeemed' }),
      rx({ id: 'neu', medicationId: 'm1', status: 'requested' }),
    ];
    expect(openPrescriptionFor(list, 'm1')?.id).toBe('neu');
    expect(openPrescriptionFor(list, 'm2')).toBeUndefined();
  });
});
