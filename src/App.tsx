import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { presetFor } from './presets/epilepsy';
import { useAppStore } from './store/appStore';
import { useState } from 'react';
import { LockScreen } from './components/LockScreen';
import { Modal } from './components/Modal';
import { IconHistory, IconMore, IconPill, IconToday } from './components/icons';
import { ProfileSwitcher } from './components/ProfileSwitcher';
import { ReminderManager } from './components/ReminderManager';
import { Toast } from './components/Toast';
import { EventForm } from './components/forms/EventForm';
import { IntakeForm } from './components/forms/IntakeForm';
import { ObservationForm } from './components/forms/ObservationForm';
import { WeightForm } from './components/forms/WeightForm';
import { CareReport } from './views/CareReport';
import { Home } from './views/Home';
import { History } from './views/History';
import { Medications } from './views/Medications';
import { More } from './views/More';
import { ProfileSetup } from './views/ProfileSetup';
import { Report } from './views/Report';
import type { View } from './store/appStore';

const NAV: { view: View; icon: JSX.Element; label: string }[] = [
  { view: 'home', icon: <IconToday />, label: 'Heute' },
  { view: 'history', icon: <IconHistory />, label: 'Verlauf' },
  { view: 'meds', icon: <IconPill />, label: 'Medikamente' },
  { view: 'more', icon: <IconMore />, label: 'Mehr' },
];

const FORM_TITLES = {
  intake: 'Einnahme erfassen',
  event: 'Ereignis erfassen',
  observation: 'Zustand erfassen',
  weight: 'Gewicht erfassen',
} as const;

export function App() {
  const { view, setView, activeProfileId, openForm, setOpenForm, locked, reportRange, careReportOpen } =
    useAppStore();
  const profiles = useLiveQuery(() => db.profiles.toArray(), []);
  const [showProfiles, setShowProfiles] = useState(false);

  if (locked) return <LockScreen />;
  if (!profiles) return null; // DB lädt (Millisekunden)
  if (profiles.length === 0) return <ProfileSetup />;

  const profile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  const preset = presetFor(profile.conditions);

  // Berichte ersetzen die komplette Shell (druckfreundlich, keine Navigation)
  if (reportRange) return <Report profile={profile} preset={preset} />;
  if (careReportOpen) return <CareReport profile={profile} preset={preset} />;

  return (
    <>
      <header className="app-header">
        <h1>
          <img className="app-logo" src="./icon.svg" alt="" aria-hidden="true" />
          care-diary
        </h1>
        <button
          className="profile-badge"
          onClick={() => setShowProfiles(true)}
          aria-label="Profil wechseln"
        >
          👤 {profile.name}
          {profiles.length > 1 ? ' ▾' : ''}
        </button>
      </header>

      <ReminderManager profile={profile} />

      <main>
        {view === 'home' && <Home profile={profile} preset={preset} />}
        {view === 'history' && <History profile={profile} preset={preset} />}
        {view === 'meds' && <Medications profile={profile} />}
        {view === 'more' && <More profile={profile} />}
      </main>

      {openForm && (
        <Modal title={FORM_TITLES[openForm]} onClose={() => setOpenForm(null)}>
          {openForm === 'intake' && <IntakeForm profile={profile} onDone={() => setOpenForm(null)} />}
          {openForm === 'event' && <EventForm profile={profile} preset={preset} onDone={() => setOpenForm(null)} />}
          {openForm === 'observation' && (
            <ObservationForm profile={profile} preset={preset} onDone={() => setOpenForm(null)} />
          )}
          {openForm === 'weight' && <WeightForm profile={profile} onDone={() => setOpenForm(null)} />}
        </Modal>
      )}

      {showProfiles && (
        <ProfileSwitcher profiles={profiles} active={profile} onClose={() => setShowProfiles(false)} />
      )}

      <Toast />

      <nav className="bottom-nav">
        {NAV.map((item) => (
          <button
            key={item.view}
            className={view === item.view ? 'active' : ''}
            onClick={() => setView(item.view)}
          >
            <span className="icon" aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}
