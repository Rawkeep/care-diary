// Verlauf: Tagebuch (nach Tagen) und Lebens-Historie als Tabs.
//
// Der Verlauf wächst mit jedem Tag — nach einem Jahr sind es tausende Zeilen,
// und die immer gleichen Einnahmen begraben das Besondere. Darum:
//   • **Zeitraum** wählbar (4 Wochen … gesamt) — steuert auch den Zustands-
//     Verlauf darüber, damit beides dasselbe Fenster zeigt.
//   • **Art-Filter** (Ereignisse / Einnahmen / Zustand) und **Suche** über
//     Notizen, Namen und Begleitumstände.
//   • **Tagesköpfe mit Zusammenfassung** („2 Ereignisse · 4 Einnahmen") und
//     Monats-Trenner zur Orientierung.
//   • **Stückweises Nachladen**: nur die ersten Tage im DOM, Rest auf Tipp.
// Sortierung: neuester Tag oben, innerhalb des Tages morgens → abends
// (Details in utils/history.ts).
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { StateTrends } from '../components/StateTrends';
import { TimelineSection } from '../components/TimelineSection';
import { EntryList } from '../components/EntryList';
import { db } from '../db/db';
import type { Profile } from '../db/models';
import type { ConditionPreset } from '../presets/epilepsy';
import { eventTypeLabel } from '../presets/epilepsy';
import { countEventsByType, inDayRange, mergeChronological } from '../utils/aggregate';
import { dayKeyDaysAgo, localDayKey } from '../utils/date';
import {
  buildDaySections,
  filterHistory,
  isFiltered,
  monthLabel,
  relativeDayLabel,
  summaryText,
  type HistoryKindFilter,
  type LabelContext,
} from '../utils/history';

/** Zeitraum-Auswahl; `null` = gesamter Verlauf */
// Kurze Labels, damit die vier Zeiträume auch auf schmalen Displays in eine
// Zeile passen (statt 3+1 umzubrechen). `title` nennt die Langform.
const RANGES: { label: string; title: string; days: number | null }[] = [
  { label: '4 Wo.', title: 'Letzte 4 Wochen', days: 28 },
  { label: '3 Mon.', title: 'Letzte 3 Monate', days: 91 },
  { label: '1 Jahr', title: 'Letztes Jahr', days: 365 },
  { label: 'Gesamt', title: 'Gesamter Verlauf', days: null },
];

const KINDS: { key: HistoryKindFilter; label: string }[] = [
  { key: 'all', label: 'Alles' },
  { key: 'event', label: '⚡ Ereignisse' },
  { key: 'intake', label: '💊 Einnahmen' },
  { key: 'observation', label: '📝 Zustand' },
];

/** Tage pro Nachlade-Schritt — hält das DOM klein und den Scroll flüssig */
const DAYS_PER_PAGE = 14;

export function History({ profile, preset }: { profile: Profile; preset: ConditionPreset }) {
  const [tab, setTab] = useState<'diary' | 'life'>('diary');
  const [rangeDays, setRangeDays] = useState<number | null>(91);
  const [kind, setKind] = useState<HistoryKindFilter>('all');
  const [query, setQuery] = useState('');
  const [visibleDays, setVisibleDays] = useState(DAYS_PER_PAGE);

  const intakes = useLiveQuery(() => db.intakes.where('profileId').equals(profile.id).toArray(), [profile.id]);
  const events = useLiveQuery(() => db.events.where('profileId').equals(profile.id).toArray(), [profile.id]);
  const observations = useLiveQuery(
    () => db.observations.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const medications = useLiveQuery(
    () => db.medications.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );

  const today = localDayKey(new Date().toISOString());
  const range = rangeDays == null ? null : { from: dayKeyDaysAgo(rangeDays - 1), to: today };

  // Bezeichnungen für Suche und Zusammenfassung (Preset + Medikamentennamen)
  const ctx: LabelContext = useMemo(
    () => ({
      medName: (id) => (medications ?? []).find((m) => m.id === id)?.name ?? 'Medikament',
      eventLabel: (type) => eventTypeLabel(preset, type),
      paramLabel: (key) => preset.observationParams.find((p) => p.key === key)?.label ?? key,
    }),
    [medications, preset]
  );

  const filter = { kind, query, range };
  const sections = useMemo(() => {
    if (!intakes || !events || !observations) return [];
    const all = mergeChronological(intakes, events, observations);
    return buildDaySections(filterHistory(all, filter, ctx), ctx);
  }, [intakes, events, observations, kind, query, rangeDays, ctx]);

  const shown = sections.slice(0, visibleDays);

  // Anhänge der sichtbaren Tage in EINER Abfrage (statt einer je Tagesgruppe)
  const shownIds = shown.flatMap((s) => s.items.map((i) => i.ref.id));
  const attachments = useLiveQuery(
    () => db.attachments.where('entryId').anyOf(shownIds).toArray(),
    [shownIds.join(',')]
  );

  if (!intakes || !events || !observations) return null;

  const eventsInRange = range ? inDayRange(events, (e) => e.startedAt, range.from, range.to) : events;
  const eventCounts = [...countEventsByType(eventsInRange).entries()].sort((a, b) => b[1] - a[1]);
  const totalEntries = sections.reduce((n, s) => n + s.items.length, 0);

  const tabs = (
    <div className="tabs">
      <button className={tab === 'diary' ? 'active' : ''} onClick={() => setTab('diary')}>
        Tagebuch
      </button>
      <button className={tab === 'life' ? 'active' : ''} onClick={() => setTab('life')}>
        Lebens-Historie
      </button>
    </div>
  );

  if (tab === 'life') {
    return (
      <>
        {tabs}
        <TimelineSection profile={profile} />
      </>
    );
  }

  function choose<T>(setter: (v: T) => void, value: T) {
    setter(value);
    setVisibleDays(DAYS_PER_PAGE); // neue Auswahl beginnt oben
  }

  return (
    <>
      {tabs}

      {/* Alle Bedienelemente in EINER Karte: Zeitraum wirkt auf Kurven,
          Zähler und Tagebuch — Art und Suche nur auf das Tagebuch. */}
      <div className="card">
        <h2>Zeitraum &amp; Filter</h2>
        <div className="chip-row">
          {RANGES.map((r) => (
            <button
              key={r.label}
              className={rangeDays === r.days ? 'active' : ''}
              onClick={() => choose(setRangeDays, r.days)}
              title={r.title}
              aria-label={r.title}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="chip-grid">
          {KINDS.map((k) => (
            <button
              key={k.key}
              className={kind === k.key ? 'active' : ''}
              onClick={() => choose(setKind, k.key)}
            >
              {k.label}
            </button>
          ))}
        </div>
        <label className="field" style={{ marginBottom: 0 }}>
          <span>Suchen in Notizen, Namen und Begleitumständen</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisibleDays(DAYS_PER_PAGE);
            }}
            placeholder="z. B. Fieber, Oma, Schlafmangel"
          />
        </label>
      </div>

      <StateTrends profile={profile} preset={preset} fixedRange={range ?? undefined} />

      {eventCounts.length > 0 && (
        <div className="card">
          <h2>Ereignisse {range ? 'im Zeitraum' : 'gesamt'}</h2>
          {eventCounts.map(([type, count]) => (
            <div
              key={type}
              className="entry kind-event"
              style={{ border: 'none', padding: '4px 0', margin: 0, background: 'none' }}
            >
              <div className="body">
                <span className="title">{eventTypeLabel(preset, type)}</span>
              </div>
              <span className="meta">{count}×</span>
            </div>
          ))}
        </div>
      )}

      {sections.length > 0 && (
        <p className="hint list-info">
          <strong>Tagebuch</strong> — {totalEntries} {totalEntries === 1 ? 'Eintrag' : 'Einträge'} an{' '}
          {sections.length} {sections.length === 1 ? 'Tag' : 'Tagen'}
          {query.trim() !== '' || kind !== 'all' ? ' (gefiltert)' : ''}. Neuester Tag oben, innerhalb
          des Tages von morgens nach abends.
        </p>
      )}

      {sections.length === 0 &&
        (isFiltered(filter) ? (
          <div className="card">
            <p className="empty" style={{ padding: '12px 8px' }}>
              Für diese Auswahl gibt es keine Einträge.
            </p>
            <button
              className="btn secondary"
              onClick={() => {
                setKind('all');
                setQuery('');
                setRangeDays(null);
                setVisibleDays(DAYS_PER_PAGE);
              }}
            >
              Filter zurücksetzen
            </button>
          </div>
        ) : (
          <p className="empty">Noch keine Einträge — starte auf „Heute".</p>
        ))}

      {shown.map((section) => (
        <div key={section.dayKey}>
          {section.monthStart && <p className="month-divider">{monthLabel(section.dayKey)}</p>}
          <div className="day-group">
            <div className="day-head">
              <p className="day-title">
                {relativeDayLabel(section.dayKey, today)}
                {section.summary.events > 0 && (
                  <span className="day-flag" title="Ereignisse an diesem Tag">
                    ⚡ {section.summary.events}
                  </span>
                )}
              </p>
              <p className="day-summary">
                {summaryText(section.summary)}
                {section.summary.eventLabels.length > 0 ? ` — ${section.summary.eventLabels.join(', ')}` : ''}
              </p>
            </div>
            <EntryList
              items={section.items}
              medications={medications ?? []}
              preset={preset}
              profile={profile}
              attachments={attachments ?? []}
            />
          </div>
        </div>
      ))}

      {sections.length > shown.length && (
        <button className="btn secondary" onClick={() => setVisibleDays(visibleDays + DAYS_PER_PAGE)}>
          Weitere Tage anzeigen ({sections.length - shown.length} noch)
        </button>
      )}
    </>
  );
}
