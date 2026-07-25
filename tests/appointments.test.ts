// Tests für Termine & Untersuchungen: Intervall-Fälligkeit, Termin-Lage,
// Vorbereitungs-Checkliste, Abschluss mit Folge-Kontrolle und Sortierung.
import { describe, expect, it } from 'vitest';
import type { Appointment } from '../src/db/models';
import { addMonthsToDayKey, daysBetweenDayKeys } from '../src/utils/date';
import {
  APPOINTMENT_KINDS,
  DEFAULT_REMINDER_DAYS,
  appointmentInfo,
  appointmentKindDef,
  appointmentTitle,
  completeAppointmentPatch,
  followUpAppointment,
  nextDueDayKey,
  openPrep,
  sortAppointments,
} from '../src/utils/appointments';

const TODAY = '2026-07-23';
const NOW = '2026-07-23T18:00:00.000Z';

/** lokale Zeit, damit `at` unabhängig von der Zeitzone auf dem Tag landet */
function localAt(y: number, m: number, d: number, h = 10): string {
  return new Date(y, m - 1, d, h).toISOString();
}

function appt(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1',
    profileId: 'p1',
    kind: 'checkup',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('Termin-Arten', () => {
  it('EEG und Blutbild bringen eine Vorbereitungs-Checkliste mit', () => {
    expect(appointmentKindDef('eeg').prep.join(' ')).toMatch(/Haare/);
    expect(appointmentKindDef('bloodwork').prep.join(' ')).toMatch(/[Nn]üchtern/);
    expect(appointmentKindDef('druglevel').prep.join(' ')).toMatch(/Einnahme/);
  });

  it('unbekannte Art fällt auf „Sonstiger Termin" zurück', () => {
    expect(appointmentKindDef('gibtesnicht' as Appointment['kind']).key).toBe('other');
  });

  it('Vorschläge sind organisatorisch, medizinisches nur „nach Anweisung"', () => {
    const alle = APPOINTMENT_KINDS.flatMap((k) => k.prep);
    for (const p of alle.filter((p) => /Schlafentzug|Nüchtern|nüchtern|Sedierung/.test(p))) {
      expect(p).toMatch(/angeordnet|Anweisung|nachfragen|abklären|organisieren/);
    }
  });

  it('Titel: Art plus Zusatz, sonst nur die Art', () => {
    expect(appointmentTitle(appt({ kind: 'eeg' }))).toBe('EEG');
    expect(appointmentTitle(appt({ kind: 'eeg', title: 'Dr. Weber' }))).toBe('EEG — Dr. Weber');
  });
});

describe('Intervall-Fälligkeit', () => {
  it('nächste Fälligkeit = letzte Durchführung + Intervall', () => {
    expect(nextDueDayKey(appt({ intervalMonths: 3, lastDoneDate: '2026-04-23' }))).toBe('2026-07-23');
    expect(nextDueDayKey(appt({ intervalMonths: 6, lastDoneDate: '2026-01-31' }))).toBe('2026-07-31');
  });

  it('ohne Intervall oder ohne letzte Durchführung: keine Fälligkeit', () => {
    expect(nextDueDayKey(appt({ intervalMonths: 3 }))).toBeNull();
    expect(nextDueDayKey(appt({ lastDoneDate: '2026-04-23' }))).toBeNull();
    expect(nextDueDayKey(appt({ intervalMonths: 0, lastDoneDate: '2026-04-23' }))).toBeNull();
  });

  it('kurze Monate werden begrenzt statt übersprungen', () => {
    expect(addMonthsToDayKey('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsToDayKey('2028-01-31', 1)).toBe('2028-02-29'); // Schaltjahr
    expect(addMonthsToDayKey('2026-12-15', 3)).toBe('2027-03-15');
  });

  it('heute fällig / überfällig / bald fällig / noch weit', () => {
    const at3 = (last: string) => appointmentInfo(appt({ intervalMonths: 3, lastDoneDate: last }), TODAY);
    expect(at3('2026-04-23').state).toBe('due');
    expect(at3('2026-04-01').state).toBe('overdue');
    expect(at3('2026-05-05').state).toBe('dueSoon'); // fällig 05.08. = in 13 Tagen
    expect(at3('2026-06-01').state).toBe('planned'); // fällig 01.09.
    expect(at3('2026-04-01').daysUntilDue).toBe(daysBetweenDayKeys(TODAY, '2026-07-01'));
  });
});

describe('geplante Termine', () => {
  it('heute / bald / geplant / vorbei', () => {
    expect(appointmentInfo(appt({ at: localAt(2026, 7, 23) }), TODAY).state).toBe('today');
    expect(appointmentInfo(appt({ at: localAt(2026, 7, 27) }), TODAY).state).toBe('soon');
    expect(appointmentInfo(appt({ at: localAt(2026, 8, 20) }), TODAY).state).toBe('planned');
    expect(appointmentInfo(appt({ at: localAt(2026, 7, 20) }), TODAY).state).toBe('past');
  });

  it('Erinnerungs-Vorlauf ist einstellbar (Standard 7 Tage)', () => {
    const at = localAt(2026, 8, 5); // in 13 Tagen
    expect(appointmentInfo(appt({ at }), TODAY).reminderDays).toBe(DEFAULT_REMINDER_DAYS);
    expect(appointmentInfo(appt({ at }), TODAY).state).toBe('planned');
    expect(appointmentInfo(appt({ at, reminderDaysBefore: 21 }), TODAY).state).toBe('soon');
  });

  it('geplanter Termin hat Vorrang vor der Intervall-Fälligkeit', () => {
    const a = appt({ at: localAt(2026, 7, 30), intervalMonths: 3, lastDoneDate: '2026-04-01' });
    const info = appointmentInfo(a, TODAY);
    expect(info.state).toBe('soon'); // nicht „overdue" — es ist ja ein Termin vereinbart
    expect(info.dueDayKey).toBe('2026-07-01');
  });

  it('abgeschlossen bleibt abgeschlossen', () => {
    const a = appt({ at: localAt(2026, 7, 20), doneDate: '2026-07-20' });
    expect(appointmentInfo(a, TODAY).state).toBe('done');
  });

  it('nur notiert, ohne Datum und Intervall ⇒ „open"', () => {
    expect(appointmentInfo(appt(), TODAY).state).toBe('open');
  });
});

describe('Vorbereitung', () => {
  it('offene Punkte = Checkliste ohne die abgehakten', () => {
    const a = appt({ prep: ['A', 'B', 'C'], prepDone: ['B'] });
    expect(openPrep(a)).toEqual(['A', 'C']);
    expect(openPrep(appt())).toEqual([]);
  });
});

describe('Abschluss und Folge-Kontrolle', () => {
  it('Abschluss setzt Erledigt- und Intervall-Datum', () => {
    const patch = completeAppointmentPatch('2026-07-23', NOW, '  EEG unauffällig  ');
    expect(patch).toMatchObject({
      doneDate: '2026-07-23',
      lastDoneDate: '2026-07-23',
      resultNote: 'EEG unauffällig',
    });
    expect(completeAppointmentPatch('2026-07-23', NOW, '   ').resultNote).toBeUndefined();
  });

  it('mit Intervall entsteht der nächste offene Datensatz (Historie bleibt)', () => {
    const a = appt({
      kind: 'bloodwork',
      title: 'Dr. Weber',
      place: 'Praxis Mitte',
      intervalMonths: 3,
      lastDoneDate: '2026-04-23',
      prep: ['Nüchtern? — vorher nachfragen'],
      at: localAt(2026, 7, 23),
      reminderDaysBefore: 14,
    });
    const next = followUpAppointment(a, '2026-07-23', 'a2', NOW)!;
    expect(next.id).toBe('a2');
    expect(next.at).toBeUndefined(); // noch kein Termin vereinbart
    expect(next.doneDate).toBeUndefined();
    expect(next.lastDoneDate).toBe('2026-07-23');
    expect(next.prep).toEqual(a.prep);
    expect(next.reminderDaysBefore).toBe(14);
    expect(nextDueDayKey(next)).toBe('2026-10-23');
    expect(appointmentInfo(next, TODAY).state).toBe('planned');
  });

  it('ohne Intervall gibt es keine Folge-Kontrolle', () => {
    expect(followUpAppointment(appt({ kind: 'mri' }), '2026-07-23', 'a2', NOW)).toBeNull();
  });
});

describe('sortAppointments', () => {
  it('Dringendes oben, Abgeschlossenes unten (jüngstes zuerst)', () => {
    const list = [
      appt({ id: 'planned', at: localAt(2026, 9, 1) }),
      appt({ id: 'done-alt', doneDate: '2026-01-10' }),
      appt({ id: 'today', at: localAt(2026, 7, 23) }),
      appt({ id: 'overdue', intervalMonths: 3, lastDoneDate: '2026-01-01' }),
      appt({ id: 'done-neu', doneDate: '2026-06-10' }),
      appt({ id: 'soon', at: localAt(2026, 7, 26) }),
    ];
    expect(sortAppointments(list, TODAY).map((a) => a.id)).toEqual([
      'overdue',
      'today',
      'soon',
      'planned',
      'done-neu',
      'done-alt',
    ]);
  });
});
