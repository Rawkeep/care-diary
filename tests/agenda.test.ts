// Tests für die Agenda — den proaktiven Kern. Zwei Dinge sind hier
// Regressionsschutz: (1) nur aktivierte Module melden sich, (2) die Hinweise
// bleiben organisatorisch (Fristen, Nachschub, Termine) und deterministisch.
import { describe, expect, it } from 'vitest';
import type {
  Appointment,
  Intake,
  MedStock,
  Medication,
  Prescription,
  Profile,
} from '../src/db/models';
import { buildAgenda, isNotifyWorthy, shortSubject, type AgendaInput } from '../src/utils/agenda';
import { MODULES } from '../src/modules/registry';

const NOW = '2026-07-23T18:00:00.000Z';
const TODAY = '2026-07-23';

function profile(modules?: string[]): Profile {
  return { id: 'p1', name: 'Mia', conditions: ['epilepsy'], modules, createdAt: NOW };
}

const keppra: Medication = {
  id: 'm1',
  profileId: 'p1',
  name: 'Levetiracetam',
  dose: 500,
  unit: 'mg',
  schedule: '1-0-1',
  isEmergency: false,
  createdAt: NOW,
};

const buccolam: Medication = {
  id: 'm2',
  profileId: 'p1',
  name: 'Buccolam',
  dose: 10,
  unit: 'mg',
  isEmergency: true,
  createdAt: NOW,
};

function rx(overrides: Partial<Prescription> = {}): Prescription {
  return {
    id: 'rx1',
    profileId: 'p1',
    title: 'Levetiracetam 500 mg N3',
    kind: 'kasse',
    status: 'needed',
    createdAt: '2026-07-10T09:00:00.000Z',
    updatedAt: '2026-07-10T09:00:00.000Z',
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
    countedAt: '2026-07-20T08:00:00.000Z',
    updatedAt: '2026-07-20T08:00:00.000Z',
    ...overrides,
  };
}

function appt(overrides: Partial<Appointment> = {}): Appointment {
  return { id: 'a1', profileId: 'p1', kind: 'checkup', createdAt: NOW, updatedAt: NOW, ...overrides };
}

function input(over: Partial<AgendaInput> = {}): AgendaInput {
  return {
    profile: profile(MODULES.map((m) => m.key)),
    medications: [keppra, buccolam],
    intakes: [] as Intake[],
    prescriptions: [],
    stocks: [],
    appointments: [],
    todayKey: TODAY,
    nowIso: NOW,
    ...over,
  };
}

describe('Modul-Schalter', () => {
  const daten = {
    prescriptions: [rx({ status: 'issued', issuedDate: '2026-06-01' })], // abgelaufen
    stocks: [stock({ units: 2 })], // fast leer
    appointments: [appt({ intervalMonths: 3, lastDoneDate: '2026-01-01' })], // überfällig
  };

  it('ohne aktivierte Module bleibt die Agenda leer', () => {
    expect(buildAgenda(input({ ...daten, profile: profile(undefined) }))).toEqual([]);
    expect(buildAgenda(input({ ...daten, profile: profile([]) }))).toEqual([]);
  });

  it('jedes Modul meldet nur, wenn es aktiviert ist', () => {
    const nurRx = buildAgenda(input({ ...daten, profile: profile(['prescriptions']) }));
    expect(nurRx.map((i) => i.module)).toEqual(['prescriptions']);
    const nurTermine = buildAgenda(input({ ...daten, profile: profile(['appointments']) }));
    expect(nurTermine.map((i) => i.module)).toEqual(['appointments']);
    const alle = buildAgenda(input(daten));
    expect(new Set(alle.map((i) => i.module))).toEqual(
      new Set(['prescriptions', 'stock', 'appointments'])
    );
  });

  it('Ernährung erinnert bewusst nicht (steht nur bereit)', () => {
    const items = buildAgenda(input({ ...daten, profile: profile(['nutrition']) }));
    expect(items).toEqual([]);
  });
});

describe('Verordnungen', () => {
  const one = (p: Prescription) => buildAgenda(input({ prescriptions: [p] }));

  it('gebraucht, angefragt-ohne-Antwort, ablaufend, abgelaufen', () => {
    expect(one(rx())[0]).toMatchObject({ severity: 'due', key: 'rx.rx1.needed' });
    expect(one(rx({ status: 'requested', requestedDate: '2026-07-22' }))).toEqual([]);
    expect(one(rx({ status: 'requested', requestedDate: '2026-07-15' }))[0]).toMatchObject({
      key: 'rx.rx1.waiting',
      severity: 'due',
    });
    const ablaufend = one(rx({ status: 'issued', issuedDate: '2026-07-01' }))[0];
    expect(ablaufend.key).toBe('rx.rx1.expiring');
    expect(ablaufend.detail).toContain('6 Tage');
    expect(one(rx({ status: 'issued', issuedDate: '2026-06-01' }))[0]).toMatchObject({
      key: 'rx.rx1.expired',
      severity: 'overdue',
    });
  });

  it('gültige und eingelöste Rezepte erzeugen kein Rauschen', () => {
    expect(one(rx({ status: 'issued', issuedDate: '2026-07-22' }))).toEqual([]);
    expect(one(rx({ status: 'redeemed', issuedDate: '2026-06-01' }))).toEqual([]);
  });

  it('sehr knappe Frist wird dringlicher gemeldet', () => {
    // 28-Tage-Rezept vom 26.06. ⇒ 1 Tag Restfrist
    expect(one(rx({ status: 'issued', issuedDate: '2026-06-26' }))[0].severity).toBe('overdue');
  });
});

describe('Bestand', () => {
  it('Reichweite unter Vorlaufzeit ⇒ Nachschub-Hinweis mit Zahl und Datum', () => {
    const items = buildAgenda(input({ stocks: [stock({ units: 12 })] }));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ module: 'stock', key: 'stock.m1.low' });
    expect(items[0].detail).toMatch(/Reicht noch 6 Tage/);
    expect(items[0].detail).toMatch(/Verordnung anzustoßen/);
  });

  it('läuft schon eine Verordnung, wird nur informiert statt gedrängt', () => {
    const items = buildAgenda(
      input({
        stocks: [stock({ units: 12 })],
        prescriptions: [rx({ medicationId: 'm1', status: 'requested', requestedDate: '2026-07-22' })],
      })
    );
    const low = items.find((i) => i.key === 'stock.m1.low')!;
    expect(low.severity).toBe('info');
    expect(low.detail).toMatch(/angefragt/);
    expect(isNotifyWorthy(low)).toBe(false);
  });

  it('aufgebraucht ist überfällig — mit laufender Verordnung nur fällig', () => {
    expect(buildAgenda(input({ stocks: [stock({ units: 0 })] }))[0]).toMatchObject({
      key: 'stock.m1.empty',
      severity: 'overdue',
    });
    const mitRx = buildAgenda(
      input({
        stocks: [stock({ units: 0 })],
        prescriptions: [rx({ medicationId: 'm1', status: 'issued', issuedDate: '2026-07-22' })],
      })
    );
    expect(mitRx.find((i) => i.key === 'stock.m1.empty')!.severity).toBe('due');
  });

  it('ausreichender Vorrat und abgesetzte Medikamente melden sich nicht', () => {
    expect(buildAgenda(input({ stocks: [stock()] }))).toEqual([]);
    const ended = { ...keppra, endDate: '2026-07-01' };
    expect(
      buildAgenda(input({ medications: [ended], stocks: [stock({ units: 0 })] }))
    ).toEqual([]);
  });

  it('Verfallsdatum: abgelaufene Notfallpackung wird überfällig gemeldet', () => {
    const items = buildAgenda(
      input({ stocks: [{ ...stock({ medicationId: 'm2' }), expiryDate: '2026-07-01' }] })
    );
    expect(items[0]).toMatchObject({ key: 'stock.m2.expired', severity: 'overdue' });
    expect(items[0].detail).toMatch(/Notfallmedikation/);
  });

  it('Bedarfsmedikation ohne Rhythmus: kein Reichweiten-Alarm, aber Verfall zählt', () => {
    const s: MedStock = { ...stock({ medicationId: 'm2', units: 4 }), expiryDate: '2026-08-10' };
    const items = buildAgenda(input({ stocks: [s] }));
    expect(items.map((i) => i.key)).toEqual(['stock.m2.expiring']);
  });
});

describe('Termine', () => {
  const localAt = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).toISOString();

  it('heute, bald (mit offener Vorbereitung), nachtragen', () => {
    const heute = buildAgenda(input({ appointments: [appt({ kind: 'eeg', at: localAt(2026, 7, 23) })] }));
    expect(heute[0]).toMatchObject({ key: 'appt.a1.today', severity: 'due' });
    expect(heute[0].title).toBe('Heute: EEG');

    const bald = buildAgenda(
      input({
        appointments: [appt({ kind: 'eeg', at: localAt(2026, 7, 26), prep: ['Haare waschen'], place: 'Uniklinik' })],
      })
    );
    expect(bald[0].key).toBe('appt.a1.soon');
    // Dativ nach „in": „in 3 Tagen", nicht „in 3 Tage"
    expect(bald[0].title).toBe('EEG in 3 Tagen');
    expect(bald[0].detail).toMatch(/Uniklinik/);
    expect(bald[0].detail).toMatch(/Haare waschen/);

    const vorbei = buildAgenda(input({ appointments: [appt({ at: localAt(2026, 7, 20) })] }));
    expect(vorbei[0]).toMatchObject({ key: 'appt.a1.past', severity: 'due' });
    expect(vorbei[0].title).toBe('Kontrolltermin nachtragen');
  });

  it('abgehakte Vorbereitung verschwindet aus dem Hinweis', () => {
    const items = buildAgenda(
      input({
        appointments: [
          appt({ at: localAt(2026, 7, 26), prep: ['Haare waschen'], prepDone: ['Haare waschen'] }),
        ],
      })
    );
    expect(items[0].detail).not.toMatch(/Haare waschen/);
  });

  it('Intervall-Kontrolle: fällig, überfällig, bald — mit Monatsangabe', () => {
    const due = buildAgenda(
      input({ appointments: [appt({ kind: 'bloodwork', intervalMonths: 3, lastDoneDate: '2026-04-23' })] })
    );
    expect(due[0]).toMatchObject({ key: 'appt.a1.due', severity: 'due' });
    expect(due[0].title).toBe('Blutbild / Laborkontrolle vereinbaren');
    expect(due[0].detail).toMatch(/3 Monate/);

    expect(
      buildAgenda(input({ appointments: [appt({ intervalMonths: 3, lastDoneDate: '2026-01-01' })] }))[0]
        .severity
    ).toBe('overdue');
    expect(
      buildAgenda(input({ appointments: [appt({ intervalMonths: 3, lastDoneDate: '2026-05-05' })] }))[0]
    ).toMatchObject({ key: 'appt.a1.dueSoon', severity: 'soon' });
  });

  it('abgeschlossene und ferne Termine melden sich nicht', () => {
    expect(buildAgenda(input({ appointments: [appt({ doneDate: '2026-07-20' })] }))).toEqual([]);
    expect(buildAgenda(input({ appointments: [appt({ at: localAt(2026, 10, 1) })] }))).toEqual([]);
    expect(buildAgenda(input({ appointments: [appt()] }))).toEqual([]);
  });
});

describe('Titel und Grammatik', () => {
  it('Titel sind kurz: Klammer-Zusätze und Beisatz nach „—" fallen weg', () => {
    expect(shortSubject('Buccolam 10 mg (Notfallset für die Schule)')).toBe('Buccolam 10 mg');
    expect(shortSubject('Blutbild / Laborkontrolle — Kontrolle unter Levetiracetam')).toBe(
      'Blutbild / Laborkontrolle'
    );
    expect(shortSubject('Kurz')).toBe('Kurz');
    // hart begrenzt, mit Auslassungszeichen
    const lang = shortSubject('Ein außergewöhnlich langer Präparatename ohne jede Klammer');
    expect(lang.length).toBeLessThanOrEqual(34);
    expect(lang.endsWith('…')).toBe(true);
  });

  it('Zeitangaben nach Präpositionen stehen im Dativ', () => {
    const rezept = buildAgenda(
      input({ prescriptions: [rx({ status: 'requested', requestedDate: '2026-07-15' })] })
    );
    expect(rezept[0].detail).toMatch(/Seit 8 Tagen angefragt/);
    const einzahl = buildAgenda(
      input({ appointments: [appt({ at: new Date(2026, 6, 24, 10).toISOString() })] })
    );
    expect(einzahl[0].title).toBe('Kontrolltermin in 1 Tag');
  });

  it('Nachschub-Titel nennen das Medikament zuerst', () => {
    const items = buildAgenda(input({ stocks: [stock({ units: 12 })] }));
    expect(items[0].title).toBe('Levetiracetam: Nachschub nötig');
  });
});

describe('Reihenfolge und Stabilität', () => {
  const daten = {
    prescriptions: [
      rx({ id: 'rxA', title: 'A-Rezept', status: 'issued', issuedDate: '2026-06-01' }), // abgelaufen
      rx({ id: 'rxB', title: 'B-Rezept' }), // gebraucht
    ],
    stocks: [stock({ units: 12 })], // low
    appointments: [
      appt({ id: 'aOver', intervalMonths: 3, lastDoneDate: '2026-01-01' }), // überfällig
      appt({ id: 'aSoon', at: new Date(2026, 6, 26, 10).toISOString() }), // bald
    ],
  };

  it('Dringendes oben, danach Modul-Reihenfolge', () => {
    const items = buildAgenda(input(daten));
    expect(items.map((i) => i.severity)).toEqual(['overdue', 'overdue', 'due', 'soon', 'soon']);
    // gleiche Dringlichkeit ⇒ Verordnungen vor Terminen (Registry-Reihenfolge)
    expect(items.slice(0, 2).map((i) => i.module)).toEqual(['prescriptions', 'appointments']);
  });

  it('gleiche Eingabe ⇒ gleiche Liste (rein funktional)', () => {
    expect(buildAgenda(input(daten))).toEqual(buildAgenda(input(daten)));
  });

  it('Schlüssel sind eindeutig — eine Benachrichtigung je Sachverhalt', () => {
    const keys = buildAgenda(input(daten)).map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('nur Fälliges/Überfälliges ist eine Benachrichtigung wert', () => {
    const items = buildAgenda(input(daten));
    expect(items.filter(isNotifyWorthy).every((i) => i.severity !== 'soon')).toBe(true);
    expect(items.filter(isNotifyWorthy).length).toBe(3);
  });
});
