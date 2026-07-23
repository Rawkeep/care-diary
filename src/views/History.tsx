// Verlauf: Tagebuch (chronologisch nach Tagen) und Lebens-Historie als Tabs.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { StateTrends } from '../components/StateTrends';
import { TimelineSection } from '../components/TimelineSection';
import { EntryList } from '../components/EntryList';
import { db } from '../db/db';
import type { Profile } from '../db/models';
import type { ConditionPreset } from '../presets/epilepsy';
import { eventTypeLabel } from '../presets/epilepsy';
import { countEventsByType, groupByDay, mergeChronological } from '../utils/aggregate';
import { fmtDate } from '../utils/date';

export function History({ profile, preset }: { profile: Profile; preset: ConditionPreset }) {
  const [tab, setTab] = useState<'diary' | 'life'>('diary');
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

  if (!intakes || !events || !observations) return null;

  const items = mergeChronological(intakes, events, observations);
  const days = groupByDay(items);
  const eventCounts = [...countEventsByType(events).entries()].sort((a, b) => b[1] - a[1]);

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

  return (
    <>
      {tabs}
      <StateTrends profile={profile} preset={preset} />
      {eventCounts.length > 0 && (
        <div className="card">
          <h2>Ereignisse gesamt</h2>
          {eventCounts.map(([type, count]) => (
            <div key={type} className="entry kind-event" style={{ border: 'none', padding: '4px 0', margin: 0, background: 'none' }}>
              <div className="body">
                <span className="title">{eventTypeLabel(preset, type)}</span>
              </div>
              <span className="meta">{count}×</span>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && <p className="empty">Noch keine Einträge — starte auf „Heute".</p>}

      {[...days.entries()].map(([dayKey, dayItems]) => (
        <div key={dayKey} className="day-group">
          <p className="day-title">{fmtDate(dayItems[0].at)}</p>
          <EntryList items={dayItems} medications={medications ?? []} preset={preset} profile={profile} />
        </div>
      ))}
    </>
  );
}
