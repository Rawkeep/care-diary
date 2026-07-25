// Termine & Untersuchungen — geplante Termine und wiederkehrende Kontrollen
// (EEG, Blutbild, Medikamentenspiegel …) mit Vorbereitungs-Checkliste.
//
// Zwei Fälligkeiten in einem Datensatz:
//   • ein **geplanter** Termin (`at`) → Erinnerung mit Vorlauf,
//   • eine **Kontrolle im Intervall** (`intervalMonths` + `lastDoneDate`) →
//     „laut Intervall wieder fällig", damit nichts jahrelang liegen bleibt.
//
// Intervalle und Vorbereitungen sind das, was die Praxis vorgegeben hat: die
// App führt die Liste, sie ordnet keine Untersuchung an. Die Vorschläge unten
// sind organisatorische Gedächtnisstützen („Impfpass mitnehmen") — alles
// Medizinische steht bewusst unter „nur nach ärztlicher Anweisung".
import type { Appointment, AppointmentKind } from '../db/models';
import { addMonthsToDayKey, daysBetweenDayKeys, localDayKey } from './date';

export interface AppointmentKindDef {
  key: AppointmentKind;
  label: string;
  /** übliches Kontrollintervall in Monaten als Vorschlag (0 = keins) */
  suggestedIntervalMonths: number;
  /** Vorbereitungs-Vorschläge zum Übernehmen in die Checkliste */
  prep: string[];
}

export const APPOINTMENT_KINDS: AppointmentKindDef[] = [
  {
    key: 'checkup',
    label: 'Kontrolltermin',
    suggestedIntervalMonths: 3,
    prep: [
      'Fragenliste aus „Mehr" mitnehmen',
      'Verlaufsbericht ausdrucken oder auf dem Handy bereithalten',
      'Aktuelle Medikamentenliste mitnehmen',
      'Versichertenkarte + Befunde einpacken',
    ],
  },
  {
    key: 'eeg',
    label: 'EEG',
    suggestedIntervalMonths: 6,
    prep: [
      'Haare gewaschen, ohne Gel/Öl/Spray',
      'Schlafentzug nur, wenn die Praxis es angeordnet hat',
      'Medikamente wie gewohnt, außer die Praxis sagt etwas anderes',
      'Beschäftigung für die Wartezeit einpacken (Buch, Kuscheltier)',
      'Etwas zu essen und zu trinken für danach',
    ],
  },
  {
    key: 'bloodwork',
    label: 'Blutbild / Laborkontrolle',
    suggestedIntervalMonths: 3,
    prep: [
      'Nüchtern? — vorher in der Praxis nachfragen',
      'Termin möglichst morgens legen',
      'Vor der Abnahme viel trinken, außer es ist anders angeordnet',
      'Laborzettel/Überweisung mitnehmen',
    ],
  },
  {
    key: 'druglevel',
    label: 'Medikamentenspiegel',
    suggestedIntervalMonths: 6,
    prep: [
      'Zeitpunkt der letzten Einnahme notieren (mit Uhrzeit)',
      'Abnahmezeit relativ zur Einnahme nach ärztlicher Anweisung',
      'Einnahme-Protokoll der letzten Tage bereithalten',
    ],
  },
  {
    key: 'mri',
    label: 'MRT / CT',
    suggestedIntervalMonths: 0,
    prep: [
      'Schmuck, Piercings und Metall zu Hause lassen',
      'Nüchtern nur, wenn es angeordnet wurde',
      'Bei Sedierung: Begleitung und Rückfahrt organisieren',
      'Voraufnahmen/CD und Befunde mitbringen',
    ],
  },
  {
    key: 'ecg',
    label: 'EKG',
    suggestedIntervalMonths: 0,
    prep: ['Bequeme, leicht zu öffnende Kleidung', 'Keine fettende Bodylotion am Termintag'],
  },
  {
    key: 'therapy',
    label: 'Therapie (Physio, Logopädie, Ergo)',
    suggestedIntervalMonths: 0,
    prep: ['Verordnung mitnehmen', 'Rezept-Frist prüfen (Modul „Verordnungen")', 'Sportsachen/Handtuch'],
  },
  {
    key: 'dentist',
    label: 'Zahnarzt',
    suggestedIntervalMonths: 6,
    prep: ['Bonusheft mitnehmen', 'Medikamentenliste mitnehmen'],
  },
  {
    key: 'vaccination',
    label: 'Impfung',
    suggestedIntervalMonths: 0,
    prep: ['Impfpass mitnehmen', 'Bei Infekt/Fieber Termin vorher abklären'],
  },
  {
    key: 'other',
    label: 'Sonstiger Termin',
    suggestedIntervalMonths: 0,
    prep: [],
  },
];

const KIND_BY_KEY: Record<string, AppointmentKindDef> = Object.fromEntries(
  APPOINTMENT_KINDS.map((k) => [k.key, k])
);

export function appointmentKindDef(kind: AppointmentKind): AppointmentKindDef {
  return KIND_BY_KEY[kind] ?? KIND_BY_KEY.other;
}

export function appointmentKindLabel(kind: AppointmentKind): string {
  return appointmentKindDef(kind).label;
}

/** „EEG — Dr. Weber" bzw. nur die Art, wenn kein Zusatz gepflegt ist */
export function appointmentTitle(a: Appointment): string {
  const label = appointmentKindLabel(a.kind);
  return a.title?.trim() ? `${label} — ${a.title.trim()}` : label;
}

/** Standard-Vorlauf der Termin-Erinnerung in Tagen */
export const DEFAULT_REMINDER_DAYS = 7;

/** Vorlauf, mit dem eine Intervall-Kontrolle als „bald fällig" gilt */
export const DUE_SOON_DAYS = 21;

export type AppointmentState =
  /** abgeschlossen (mit Datum, ggf. Ergebnis) */
  | 'done'
  /** geplanter Termin ist heute */
  | 'today'
  /** geplanter Termin innerhalb des Erinnerungs-Vorlaufs */
  | 'soon'
  /** geplanter Termin liegt weiter in der Zukunft */
  | 'planned'
  /** geplanter Termin ist vorbei, aber nicht abgeschlossen → nachtragen */
  | 'past'
  /** Intervall-Kontrolle heute fällig */
  | 'due'
  /** Intervall-Fälligkeit überschritten */
  | 'overdue'
  /** Intervall-Kontrolle in Sichtweite → Termin vereinbaren */
  | 'dueSoon'
  /** nur notiert: kein Termin, kein Intervall */
  | 'open';

export interface AppointmentInfo {
  state: AppointmentState;
  /** Tage bis zum geplanten Termin (negativ = vorbei); null ohne `at` */
  daysUntil: number | null;
  /** rechnerische Intervall-Fälligkeit (Day-Key); null ohne Intervall */
  dueDayKey: string | null;
  /** Tage bis zur Intervall-Fälligkeit (negativ = überfällig) */
  daysUntilDue: number | null;
  /** Vorlauf der Erinnerung, der hier greift */
  reminderDays: number;
}

/** Nächste Fälligkeit aus Intervall + letzter Durchführung */
export function nextDueDayKey(a: Appointment): string | null {
  if (!a.intervalMonths || a.intervalMonths <= 0 || !a.lastDoneDate) return null;
  return addMonthsToDayKey(a.lastDoneDate, a.intervalMonths);
}

/**
 * Lage eines Termins zum Tag `todayKey`. Ein konkret geplanter Termin hat
 * Vorrang vor der Intervall-Fälligkeit (er ist ja die Antwort darauf).
 */
export function appointmentInfo(a: Appointment, todayKey: string): AppointmentInfo {
  const reminderDays = a.reminderDaysBefore ?? DEFAULT_REMINDER_DAYS;
  const dueDayKey = nextDueDayKey(a);
  const daysUntilDue = dueDayKey ? daysBetweenDayKeys(todayKey, dueDayKey) : null;
  const daysUntil = a.at ? daysBetweenDayKeys(todayKey, localDayKey(a.at)) : null;
  const base = { daysUntil, dueDayKey, daysUntilDue, reminderDays };

  if (a.doneDate) return { ...base, state: 'done' };

  if (daysUntil != null) {
    if (daysUntil < 0) return { ...base, state: 'past' };
    if (daysUntil === 0) return { ...base, state: 'today' };
    return { ...base, state: daysUntil <= reminderDays ? 'soon' : 'planned' };
  }

  if (daysUntilDue != null) {
    if (daysUntilDue < 0) return { ...base, state: 'overdue' };
    if (daysUntilDue === 0) return { ...base, state: 'due' };
    return { ...base, state: daysUntilDue <= DUE_SOON_DAYS ? 'dueSoon' : 'planned' };
  }

  return { ...base, state: 'open' };
}

/** Änderungen fürs Abschließen — `lastDoneDate` trägt das Intervall weiter */
export function completeAppointmentPatch(
  doneDate: string,
  nowIso: string,
  resultNote?: string
): Partial<Appointment> {
  return {
    doneDate,
    lastDoneDate: doneDate,
    resultNote: resultNote?.trim() || undefined,
    updatedAt: nowIso,
  };
}

/**
 * Folge-Datensatz einer Kontrolle: gleiche Art, gleiches Intervall, neuer
 * Zeitpunkt-Anker. So bleibt der abgeschlossene Termin als Historie stehen
 * und die nächste Fälligkeit ist sofort im Blick. Ohne Intervall: null.
 */
export function followUpAppointment(
  a: Appointment,
  doneDate: string,
  id: string,
  nowIso: string
): Appointment | null {
  if (!a.intervalMonths || a.intervalMonths <= 0) return null;
  return {
    id,
    profileId: a.profileId,
    kind: a.kind,
    title: a.title,
    place: a.place,
    intervalMonths: a.intervalMonths,
    lastDoneDate: doneDate,
    prep: a.prep,
    reminderDaysBefore: a.reminderDaysBefore,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

const STATE_RANK: Record<AppointmentState, number> = {
  overdue: 0,
  due: 1,
  today: 2,
  past: 3,
  soon: 4,
  dueSoon: 5,
  planned: 6,
  open: 7,
  done: 8,
};

export function appointmentStateRank(state: AppointmentState): number {
  return STATE_RANK[state];
}

/** Dringendes zuerst; innerhalb gleicher Lage der frühere Zeitpunkt zuerst */
export function sortAppointments(list: Appointment[], todayKey: string): Appointment[] {
  return [...list].sort((a, b) => {
    const ia = appointmentInfo(a, todayKey);
    const ib = appointmentInfo(b, todayKey);
    const ra = STATE_RANK[ia.state];
    const rb = STATE_RANK[ib.state];
    if (ra !== rb) return ra - rb;
    const ka = a.doneDate ?? (a.at ? localDayKey(a.at) : (ia.dueDayKey ?? '9999-12-31'));
    const kb = b.doneDate ?? (b.at ? localDayKey(b.at) : (ib.dueDayKey ?? '9999-12-31'));
    // Abgeschlossene: das Jüngste oben; alles andere: das Nächste oben
    return a.doneDate && b.doneDate ? kb.localeCompare(ka) : ka.localeCompare(kb);
  });
}

/** Offene Punkte der Vorbereitungs-Checkliste */
export function openPrep(a: Appointment): string[] {
  const done = new Set(a.prepDone ?? []);
  return (a.prep ?? []).filter((p) => !done.has(p));
}
