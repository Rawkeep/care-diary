// Heute-Ansicht: Akut-Button, Schnellerfassung in ≤ 3 Taps, Tagesüberblick.
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { EntryList } from '../components/EntryList';
import {
  IconDone,
  IconEmergency,
  IconEvent,
  IconPill,
  IconState,
  IconWeight,
} from '../components/icons';
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
          <IconEvent size={20} className="inline-icon" /> Akut: Ereignis beginnt jetzt
        </button>
      )}

      {orderedMeds.length > 0 && (() => {
        // Volle Buttons nur für Medikamente mit Handlungsbedarf (offen/fällig,
        // Notfall im Akutfall); alles andere kompakt als Chips — erreichbar
        // und erkennbar, ohne die Startseite zu fluten.
        const needsAction = ({ med: m, open, due }: (typeof orderedMeds)[number]) =>
          open.length > 0 || due || (acuteStartedAt != null && m.isEmergency);
        const primary = orderedMeds.filter(needsAction);
        const secondary = orderedMeds.filter((s) => !needsAction(s));
        return (
          <>
            {primary.length > 0 && (
              <div className="med-quick">
                {primary.map(({ med: m, open, due }) => {
                  const classes = ['med-quick-btn', m.isEmergency ? 'emergency' : '', due ? 'due' : '']
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <button key={m.id} className={classes} onClick={() => logNow(m)}>
                      <span className="med-quick-name">
                        {m.isEmergency ? <IconEmergency size={18} className="inline-icon" /> : <IconPill size={18} className="inline-icon" />}
                        {' '}{m.name}
                        {m.isEmergency ? ' · Notfall' : ''}
                      </span>
                      <span className="med-quick-dose">
                        {effectiveDose(m, nowIso())} {m.unit} — jetzt genommen
                      </span>
                      {open.length > 0 && (
                        <span className="med-quick-status open">
                          {due ? `⏰ jetzt fällig: ${open.join(', ')}` : `heute noch offen: ${open.join(', ')}`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {secondary.length > 0 && (
              <div className="med-chips">
                {secondary.map(({ med: m, done }) => (
                  <button
                    key={m.id}
                    className={m.isEmergency ? 'med-chip emergency' : 'med-chip'}
                    onClick={() => logNow(m)}
                    aria-label={`${m.name} jetzt genommen erfassen`}
                  >
                    {m.isEmergency ? (
                      <IconEmergency size={15} className="inline-icon" />
                    ) : done ? (
                      <IconDone size={15} className="inline-icon" />
                    ) : (
                      <IconPill size={15} className="inline-icon" />
                    )}{' '}
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </>
        );
      })()}

      <div className="quick-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {/* Reihenfolge nach Nutzungshäufigkeit: täglich → selten */}
        <button className="quick-btn" onClick={() => setOpenForm('intake')}>
          <span className="icon"><IconPill size={30} /></span>Einnahme
        </button>
        <button className="quick-btn" onClick={() => setOpenForm('observation')}>
          <span className="icon"><IconState size={30} /></span>Zustand
        </button>
        <button className="quick-btn" onClick={() => setOpenForm('event')}>
          <span className="icon"><IconEvent size={30} /></span>Ereignis
        </button>
        <button className="quick-btn" onClick={() => setOpenForm('weight')}>
          <span className="icon"><IconWeight size={30} /></span>Gewicht
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
        <EntryList items={todayItems} medications={medications ?? []} preset={preset} profile={profile} />
      </div>
    </>
  );
}
