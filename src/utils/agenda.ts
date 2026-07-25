// Agenda — der proaktive Teil der App: „Woran müsstet ihr gerade denken?"
//
// Eine reine Funktion über den Datenbestand: aus Verordnungen, Bestand und
// Terminen entsteht eine sortierte Liste von Hinweisen. Deterministisch,
// testbar, ohne Nebenwirkungen — die Oberfläche zeigt sie an, der
// ReminderManager macht (höchstens einmal pro Tag) eine Benachrichtigung
// daraus.
//
// Zwei Grenzen sind eingebaut und nicht verhandelbar:
//   1. **Nur Organisation.** Fristen, Nachschub, Termine, Vorbereitung. Keine
//      medizinische Bewertung, keine Warnung vor Krankheitsverläufen, keine
//      Vorhersage — das bleibt beim Arzt (KONZEPT.md §8).
//   2. **Nur aktivierte Module.** Wer ein Modul nicht braucht, hört nichts
//      davon.
//
// Nachdrücklichkeit statt Nachdruck: jede Zeile ist eine Beobachtung mit
// Zahl und Datum, kein Vorwurf und kein Ausrufezeichen-Gewitter.
import type {
  Appointment,
  Intake,
  MedStock,
  Medication,
  Prescription,
  Profile,
} from '../db/models';
import { moduleEnabled, moduleOrder, type ModuleKey } from '../modules/registry';
import { appointmentInfo, appointmentTitle, openPrep } from './appointments';
import { fmtDayKey, fmtDays, localDayKey } from './date';
import { openPrescriptionFor, prescriptionInfo, PRESCRIPTION_STATUS_LABEL } from './prescription';
import { projectStock, stockExpiry } from './stock';

export type AgendaSeverity = 'overdue' | 'due' | 'soon' | 'info';

export interface AgendaItem {
  /**
   * Stabiler Schlüssel je Sachverhalt (z. B. `rx.<id>.expiring`) — trägt die
   * Benachrichtigungs-Sperre „einmal pro Tag" und React-Keys.
   */
  key: string;
  module: ModuleKey;
  severity: AgendaSeverity;
  title: string;
  detail: string;
}

export interface AgendaInput {
  profile: Profile;
  medications: Medication[];
  intakes: Intake[];
  prescriptions: Prescription[];
  stocks: MedStock[];
  appointments: Appointment[];
  /** heutiger Day-Key (lokal) */
  todayKey: string;
  /** aktueller Zeitpunkt (ISO) — für die Bestands-Hochrechnung */
  nowIso: string;
}

const SEVERITY_RANK: Record<AgendaSeverity, number> = { overdue: 0, due: 1, soon: 2, info: 3 };

export function severityRank(s: AgendaSeverity): number {
  return SEVERITY_RANK[s];
}

/** Was eine Benachrichtigung wert ist — „bald" reicht in der Ansicht */
export function isNotifyWorthy(item: AgendaItem): boolean {
  return item.severity === 'overdue' || item.severity === 'due';
}

/**
 * Alle Hinweise, dringendste zuerst. Innerhalb gleicher Dringlichkeit nach
 * Modul-Reihenfolge und Titel — dieselben Daten ergeben immer dieselbe Liste.
 */
export function buildAgenda(input: AgendaInput): AgendaItem[] {
  const modules = input.profile.modules;
  const items: AgendaItem[] = [];
  if (moduleEnabled(modules, 'prescriptions')) items.push(...prescriptionAgenda(input));
  if (moduleEnabled(modules, 'stock')) items.push(...stockAgenda(input));
  if (moduleEnabled(modules, 'appointments')) items.push(...appointmentAgenda(input));
  return items.sort((a, b) => {
    const rs = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (rs !== 0) return rs;
    const rm = moduleOrder(a.module) - moduleOrder(b.module);
    if (rm !== 0) return rm;
    return a.title.localeCompare(b.title, 'de');
  });
}

// --- Verordnungen & Fristen ---------------------------------------------

export function prescriptionAgenda({ prescriptions, todayKey }: AgendaInput): AgendaItem[] {
  const out: AgendaItem[] = [];
  for (const p of prescriptions) {
    const info = prescriptionInfo(p, todayKey);
    const at = (p.prescriber ?? '').trim();
    const bei = at ? ` bei ${at}` : '';
    switch (info.state) {
      case 'needed':
        out.push({
          key: `rx.${p.id}.needed`,
          module: 'prescriptions',
          severity: info.openDays != null && info.openDays >= 3 ? 'due' : 'soon',
          title: `Verordnung anfordern: ${p.title}`,
          detail:
            `Steht als „${PRESCRIPTION_STATUS_LABEL.needed}" auf der Liste` +
            (info.openDays && info.openDays > 0 ? ` — seit ${fmtDays(info.openDays)}` : '') +
            `${bei ? `. Ansprechpartner: ${at}` : ''}.`,
        });
        break;
      case 'waiting':
        out.push({
          key: `rx.${p.id}.waiting`,
          module: 'prescriptions',
          severity: 'due',
          title: `Nachfragen: ${p.title}`,
          detail: `Seit ${fmtDays(info.waitingDays ?? 0)} angefragt${bei} und noch nichts eingetroffen.`,
        });
        break;
      case 'expiring':
        out.push({
          key: `rx.${p.id}.expiring`,
          module: 'prescriptions',
          severity: (info.daysLeft ?? 0) <= 2 ? 'overdue' : 'due',
          title: `Rezept einlösen: ${p.title}`,
          detail:
            `Noch ${fmtDays(info.daysLeft ?? 0)} einlösbar (bis ${fmtDayKey(info.expiry!)}).` +
            ' Frist bitte auf dem Beleg prüfen.',
        });
        break;
      case 'expired':
        out.push({
          key: `rx.${p.id}.expired`,
          module: 'prescriptions',
          severity: 'overdue',
          title: `Frist abgelaufen: ${p.title}`,
          detail: `War bis ${fmtDayKey(info.expiry!)} einlösbar — eine neue Verordnung ist nötig.`,
        });
        break;
      default:
        break; // requested (noch im Zeitfenster), valid, redeemed, ohne Datum
    }
  }
  return out;
}

// --- Medikamenten-Bestand ------------------------------------------------

export function stockAgenda({
  medications,
  intakes,
  stocks,
  prescriptions,
  todayKey,
  nowIso,
  profile,
}: AgendaInput): AgendaItem[] {
  const out: AgendaItem[] = [];
  const rxEnabled = moduleEnabled(profile.modules, 'prescriptions');
  for (const stock of stocks) {
    const med = medications.find((m) => m.id === stock.medicationId);
    if (!med || med.endDate) continue; // abgesetzt: kein Nachschub nötig

    // Verfallsdatum zuerst — betrifft auch unangetastete Notfallpackungen
    const exp = stockExpiry(stock, todayKey);
    if (exp.state === 'expired') {
      out.push({
        key: `stock.${stock.medicationId}.expired`,
        module: 'stock',
        severity: 'overdue',
        title: `${med.name}: Packung abgelaufen`,
        detail:
          `Verfallsdatum war ${fmtDayKey(stock.expiryDate!)}` +
          `${med.isEmergency ? ' — bei Notfallmedikation besonders wichtig' : ''}. Ersatz besorgen.`,
      });
    } else if (exp.state === 'soon') {
      out.push({
        key: `stock.${stock.medicationId}.expiring`,
        module: 'stock',
        severity: (exp.daysLeft ?? 0) <= 7 ? 'due' : 'soon',
        title: `${med.name}: Packung läuft ab`,
        detail: `Verfallsdatum ${fmtDayKey(stock.expiryDate!)} — noch ${fmtDays(exp.daysLeft ?? 0)}.`,
      });
    }

    const p = projectStock(stock, med, intakes, nowIso);
    if (p.state === 'ok' || p.state === 'unknown') continue;

    // Modul-Zusammenspiel: ist Nachschub schon unterwegs, wird nur informiert
    const openRx = rxEnabled ? openPrescriptionFor(prescriptions, med.id) : undefined;
    const rxNote = openRx
      ? ` Verordnung ist ${PRESCRIPTION_STATUS_LABEL[openRx.status]} — siehe „Verordnungen".`
      : ' Zeit, eine Verordnung anzustoßen.';

    if (p.state === 'empty') {
      out.push({
        key: `stock.${stock.medicationId}.empty`,
        module: 'stock',
        severity: openRx ? 'due' : 'overdue',
        title: `${med.name}: Bestand aufgebraucht`,
        detail: `Laut Zählung und dokumentierten Einnahmen ist nichts mehr da.${rxNote}`,
      });
      continue;
    }

    const severity: AgendaSeverity = openRx ? 'info' : p.state === 'critical' ? 'due' : 'soon';
    out.push({
      key: `stock.${stock.medicationId}.low`,
      module: 'stock',
      severity,
      title: `${med.name}: Nachschub nötig`,
      detail:
        `Reicht noch ${fmtDays(p.daysLeft ?? 0)} (bis ${fmtDayKey(p.emptyOn!)}), ` +
        `Vorlauf ${fmtDays(stock.leadDays)}.${rxNote}`,
    });
  }
  return out;
}

// --- Termine & Untersuchungen -------------------------------------------

export function appointmentAgenda({ appointments, todayKey }: AgendaInput): AgendaItem[] {
  const out: AgendaItem[] = [];
  for (const a of appointments) {
    const info = appointmentInfo(a, todayKey);
    const title = appointmentTitle(a);
    const prep = openPrep(a);
    const prepNote =
      prep.length > 0 ? ` Offen in der Vorbereitung: ${prep.slice(0, 3).join('; ')}.` : '';
    const place = a.place?.trim() ? ` · ${a.place.trim()}` : '';

    switch (info.state) {
      case 'today':
        out.push({
          key: `appt.${a.id}.today`,
          module: 'appointments',
          severity: 'due',
          title: `Heute: ${title}`,
          detail: `Termin heute${place}.${prepNote}`,
        });
        break;
      case 'soon':
        out.push({
          key: `appt.${a.id}.soon`,
          module: 'appointments',
          severity: prep.length > 0 && (info.daysUntil ?? 0) <= 1 ? 'due' : 'soon',
          title: `${title} in ${fmtDays(info.daysUntil ?? 0)}`,
          detail: `Termin am ${fmtDayKey(localDayKey(a.at!))}${place}.${prepNote}`,
        });
        break;
      case 'past':
        out.push({
          key: `appt.${a.id}.past`,
          module: 'appointments',
          severity: 'due',
          title: `Nachtragen: ${title}`,
          detail:
            `Der Termin war ${fmtDayKey(localDayKey(a.at!))} und ist noch offen. ` +
            'Als erledigt markieren — dann läuft das Intervall weiter.',
        });
        break;
      case 'due':
      case 'overdue':
        out.push({
          key: `appt.${a.id}.due`,
          module: 'appointments',
          severity: info.state === 'overdue' ? 'overdue' : 'due',
          title: `Kontrolle fällig: ${title}`,
          detail:
            `Laut Intervall (${a.intervalMonths} Monate) fällig seit ${fmtDayKey(info.dueDayKey!)}` +
            `${a.lastDoneDate ? `, zuletzt ${fmtDayKey(a.lastDoneDate)}` : ''}. Termin vereinbaren.`,
        });
        break;
      case 'dueSoon':
        out.push({
          key: `appt.${a.id}.dueSoon`,
          module: 'appointments',
          severity: 'soon',
          title: `Kontrolle bald fällig: ${title}`,
          detail:
            `Laut Intervall (${a.intervalMonths} Monate) ab ${fmtDayKey(info.dueDayKey!)} — ` +
            'jetzt ist ein guter Zeitpunkt für einen Termin.',
        });
        break;
      default:
        break; // planned, open, done
    }
  }
  return out;
}
