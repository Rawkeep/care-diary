// Verlauf — Aufbereitung des Tagebuchs: filtern, gruppieren, zusammenfassen.
//
// Warum das nötig ist: nach einem Jahr Doku stehen hier über tausend Zeilen,
// und die immer gleichen Einnahme-Einträge begraben genau das, was man sucht
// („wann war der letzte große Anfall?"). Deshalb drei Dinge:
//   1. **Sortierung mit Aussage** — Tage absteigend (neuester Tag oben),
//      innerhalb eines Tages aufsteigend: ein Tag liest sich von morgens nach
//      abends, so wie er passiert ist. Bei gleicher Uhrzeit entscheidet die
//      fachliche Wichtigkeit (Ereignis → Einnahme → Zustand), nicht der
//      Zufall der Alphabetreihenfolge.
//   2. **Filter statt Endlos-Liste** — Zeitraum, Art und Freitext.
//   3. **Tages-Zusammenfassung** — eine Zeile pro Tag, damit man scrollend
//      erkennt, wo etwas los war, ohne jede Zeile zu lesen.
//
// Alles rein funktional und getestet; die Ansicht rendert nur.
import type { HealthEvent, Intake, Observation } from '../db/models';
import type { DiaryItem } from './aggregate';
import { localDayKey } from './date';

export type DiaryKind = DiaryItem['kind'];

/**
 * Rangfolge bei zeitgleichen Einträgen: das Ereignis zuerst, dann die
 * Einnahme, dann der Zustandswert. (Bisher entschied `localeCompare` über die
 * Art — dass dabei dieselbe Reihenfolge herauskam, war Zufall.)
 */
export const KIND_RANK: Record<DiaryKind, number> = { event: 0, intake: 1, observation: 2 };

/** Auflösung von IDs/Keys zu lesbaren Bezeichnungen (aus Preset und Medikamenten) */
export interface LabelContext {
  medName: (medicationId: string) => string;
  eventLabel: (type: string) => string;
  paramLabel: (parameter: string) => string;
}

/** Alles, was an einem Eintrag durchsuchbar ist: Bezeichnung, Notiz, Umstände */
export function itemHaystack(item: DiaryItem, ctx: LabelContext): string {
  if (item.kind === 'intake') {
    const i = item.ref as Intake;
    return [ctx.medName(i.medicationId), i.status, i.unit, i.note].filter(Boolean).join(' ');
  }
  if (item.kind === 'event') {
    const e = item.ref as HealthEvent;
    return [ctx.eventLabel(e.type), ...e.circumstances, e.note].filter(Boolean).join(' ');
  }
  const o = item.ref as Observation;
  return [ctx.paramLabel(o.parameter), o.note].filter(Boolean).join(' ');
}

export type HistoryKindFilter = 'all' | DiaryKind;

export interface HistoryFilter {
  /** Art der Einträge; `all` = keine Einschränkung */
  kind: HistoryKindFilter;
  /** Freitext über Bezeichnungen, Notizen und Begleitumstände (leer = aus) */
  query: string;
  /** Tages-Zeitraum (Day-Keys, inklusiv); null = gesamter Verlauf */
  range: { from: string; to: string } | null;
}

export const ALL_ITEMS: HistoryFilter = { kind: 'all', query: '', range: null };

/** Ist überhaupt etwas eingeschränkt? (steuert Hinweise in der Ansicht) */
export function isFiltered(f: HistoryFilter): boolean {
  return f.kind !== 'all' || f.query.trim() !== '' || f.range != null;
}

/**
 * Filtert nach Art, Zeitraum und Freitext. Die Suche ist absichtlich einfach
 * (Teilstring, Groß-/Kleinschreibung egal) — sie soll „Oma" oder „Fieber"
 * finden, keine Suchsprache lernen lassen.
 */
export function filterHistory(
  items: DiaryItem[],
  filter: HistoryFilter,
  ctx: LabelContext
): DiaryItem[] {
  const q = filter.query.trim().toLowerCase();
  return items.filter((item) => {
    if (filter.kind !== 'all' && item.kind !== filter.kind) return false;
    if (filter.range) {
      const key = localDayKey(item.at);
      if (key < filter.range.from || key > filter.range.to) return false;
    }
    if (q && !itemHaystack(item, ctx).toLowerCase().includes(q)) return false;
    return true;
  });
}

export interface DaySummary {
  events: number;
  intakes: number;
  observations: number;
  /** ausgelassene Einnahmen (fürs Arztgespräch relevant) */
  missedIntakes: number;
  /** Einträge mit Freitext — dort steckt meist die Erinnerung */
  notes: number;
  /** Ereignisarten des Tages, in Vorkommens-Reihenfolge, ohne Dopplungen */
  eventLabels: string[];
  /** höchster erfasster Schweregrad des Tages (falls dokumentiert) */
  maxSeverity?: number;
}

export interface DaySection {
  dayKey: string;
  items: DiaryItem[];
  summary: DaySummary;
  /** erster Abschnitt eines Monats ⇒ Monats-Trenner darüber */
  monthStart: boolean;
}

function summarize(items: DiaryItem[], ctx: LabelContext): DaySummary {
  const s: DaySummary = {
    events: 0,
    intakes: 0,
    observations: 0,
    missedIntakes: 0,
    notes: 0,
    eventLabels: [],
  };
  for (const item of items) {
    const ref = item.ref as { note?: string };
    if (ref.note?.trim()) s.notes += 1;
    if (item.kind === 'event') {
      const e = item.ref as HealthEvent;
      s.events += 1;
      const label = ctx.eventLabel(e.type);
      if (!s.eventLabels.includes(label)) s.eventLabels.push(label);
      if (e.severity != null && (s.maxSeverity == null || e.severity > s.maxSeverity)) {
        s.maxSeverity = e.severity;
      }
    } else if (item.kind === 'intake') {
      s.intakes += 1;
      if ((item.ref as Intake).status === 'missed') s.missedIntakes += 1;
    } else {
      s.observations += 1;
    }
  }
  return s;
}

/**
 * Einträge EINES Tages in Lesereihenfolge: morgens → abends, bei gleicher
 * Uhrzeit nach Wichtigkeit. Auch die „Heute"-Karte nutzt das, damit ein Tag
 * überall gleich sortiert ist.
 */
export function sortWithinDay(items: DiaryItem[]): DiaryItem[] {
  return [...items].sort(
    (a, b) => a.at.localeCompare(b.at) || KIND_RANK[a.kind] - KIND_RANK[b.kind]
  );
}

/**
 * Tagesabschnitte: neuester Tag oben, innerhalb des Tages chronologisch
 * (morgens → abends). Unabhängig von der Reihenfolge der Eingabe.
 */
export function buildDaySections(items: DiaryItem[], ctx: LabelContext): DaySection[] {
  const byDay = new Map<string, DiaryItem[]>();
  for (const item of items) {
    const key = localDayKey(item.at);
    const list = byDay.get(key);
    if (list) list.push(item);
    else byDay.set(key, [item]);
  }
  const dayKeys = [...byDay.keys()].sort((a, b) => b.localeCompare(a));
  return dayKeys.map((dayKey, idx) => {
    const dayItems = sortWithinDay(byDay.get(dayKey)!);
    return {
      dayKey,
      items: dayItems,
      summary: summarize(dayItems, ctx),
      monthStart: idx === 0 || monthKeyOf(dayKeys[idx - 1]) !== monthKeyOf(dayKey),
    };
  });
}

export function monthKeyOf(dayKey: string): string {
  return dayKey.slice(0, 7);
}

const MONTH_NAMES = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

/** „Juli 2026" — Trenner zur Orientierung beim Scrollen */
export function monthLabel(dayKey: string): string {
  const [y, m] = dayKey.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

const WEEKDAYS = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];

/** „Heute" / „Gestern" / „Vorgestern" / „Do., 23.07.2026" */
export function relativeDayLabel(dayKey: string, todayKey: string): string {
  if (dayKey === todayKey) return 'Heute';
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  const [ty, tm, td] = todayKey.split('-').map(Number);
  const diff = Math.round(
    (Date.UTC(ty, tm - 1, td, 12) - date.getTime()) / 86_400_000
  );
  if (diff === 1) return 'Gestern';
  if (diff === 2) return 'Vorgestern';
  const dd = String(d).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${WEEKDAYS[date.getUTCDay()]}, ${dd}.${mm}.${y}`;
}

/** „2 Ereignisse · 4 Einnahmen (1 ausgelassen) · 5× Zustand" */
export function summaryText(s: DaySummary): string {
  const parts: string[] = [];
  if (s.events > 0) parts.push(s.events === 1 ? '1 Ereignis' : `${s.events} Ereignisse`);
  if (s.intakes > 0) {
    const base = s.intakes === 1 ? '1 Einnahme' : `${s.intakes} Einnahmen`;
    parts.push(s.missedIntakes > 0 ? `${base} (${s.missedIntakes} ausgelassen)` : base);
  }
  if (s.observations > 0) parts.push(`${s.observations}× Zustand`);
  return parts.join(' · ');
}
