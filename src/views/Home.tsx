// Heute-Ansicht: Akut-Button, Schnellerfassung in ≤ 3 Taps, Tagesüberblick.
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { EntryList } from '../components/EntryList';
import { db } from '../db/db';
import type { Medication, Profile } from '../db/models';
import { nowIso } from '../db/models';
import type { ConditionPreset } from '../presets/epilepsy';
import { useAppStore } from '../store/appStore';
import { itemsOfDay, mergeChronological } from '../utils/aggregate';
import { daysSinceLastEvent } from '../utils/correlation';
import { fmtDuration, localDayKey } from '../utils/date';
import { effectiveDose } from '../utils/dose';
import { orderMedsForHome } from '../utils/medOrder';
import { quickIntake } from '../utils/quickIntake';

export function Home({ profile, preset }: { profile: Profile; preset: ConditionPreset }) {
  const { setOpenForm, acuteStartedAt, startAcute, showToast } = useAppStore();

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

  // Sekündliches Re-Render nur bei laufendem Akut-Timer
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!acuteStartedAt) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [acuteStartedAt]);

  const todayKey = localDayKey(new Date().toISOString());
  const eventFreeDays = daysSinceLastEvent(events ?? [], todayKey);
  const todayItems = itemsOfDay(
    mergeChronological(intakes ?? [], events ?? [], observations ?? []),
    todayKey
  );

  const elapsed = acuteStartedAt
    ? Math.round((Date.now() - new Date(acuteStartedAt).getTime()) / 1000)
    : 0;

  // Ein Tipp = erfasst. Rückgängig über den Toast, Details über das Formular.
  // Reihenfolge kontextabhängig: fällig oben, erledigt gedimmt unten,
  // Notfallmedikation im Akutfall ganz vorn (stabile Zonen drumherum).
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const orderedMeds = orderMedsForHome(
    medications ?? [],
    intakes ?? [],
    todayKey,
    hhmm,
    acuteStartedAt != null
  );
  async function logNow(med: Medication) {
    const intake = quickIntake(med);
    await db.intakes.add(intake);
    showToast(`✓ ${med.name} erfasst`, () => db.intakes.delete(intake.id));
  }

  return (
    <>
      {acuteStartedAt ? (
        <button className="acute-btn running" onClick={() => setOpenForm('event')}>
          ⏱ Ereignis läuft — tippen zum Beenden &amp; Erfassen
          <span className="acute-timer">{fmtDuration(elapsed)}</span>
        </button>
      ) : (
        <button className="acute-btn" onClick={startAcute}>
          ⚡ Akut: Ereignis beginnt jetzt
        </button>
      )}

      {orderedMeds.length > 0 && (
        <div className="med-quick">
          {orderedMeds.map(({ med: m, open, due, done }) => {
            const classes = [
              'med-quick-btn',
              m.isEmergency ? 'emergency' : '',
              due ? 'due' : '',
              done ? 'muted' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button key={m.id} className={classes} onClick={() => logNow(m)}>
                <span className="med-quick-name">
                  💊 {m.name}
                  {m.isEmergency ? ' · Notfall' : ''}
                </span>
                <span className="med-quick-dose">
                  {effectiveDose(m, nowIso())} {m.unit} — jetzt genommen
                </span>
                {(open.length > 0 || done) && (
                  <span className={done ? 'med-quick-status done' : 'med-quick-status open'}>
                    {done
                      ? '✓ heute erledigt'
                      : due
                        ? `⏰ jetzt fällig: ${open.join(', ')}`
                        : `heute noch offen: ${open.join(', ')}`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="quick-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {/* Reihenfolge nach Nutzungshäufigkeit: täglich → selten */}
        <button className="quick-btn" onClick={() => setOpenForm('intake')}>
          <span className="icon">💊</span>Einnahme
        </button>
        <button className="quick-btn" onClick={() => setOpenForm('observation')}>
          <span className="icon">📝</span>Zustand
        </button>
        <button className="quick-btn" onClick={() => setOpenForm('event')}>
          <span className="icon">⚡</span>Ereignis
        </button>
        <button className="quick-btn" onClick={() => setOpenForm('weight')}>
          <span className="icon">⚖️</span>Gewicht
        </button>
      </div>

      {eventFreeDays != null && (
        <div className={eventFreeDays === 0 ? 'streak-badge today' : 'streak-badge'}>
          {eventFreeDays === 0
            ? '⚡ Heute ein Ereignis dokumentiert'
            : eventFreeDays === 1
              ? '🕊 1 Tag ohne Ereignis'
              : `🕊 ${eventFreeDays} Tage ohne Ereignis`}
        </div>
      )}

      <div className="card">
        <h2>Heute</h2>
        <EntryList items={todayItems} medications={medications ?? []} preset={preset} />
      </div>
    </>
  );
}
