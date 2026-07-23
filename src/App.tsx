import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { presetFor } from './presets/epilepsy';
import { useAppStore } from './store/appStore';
import { LockScreen } from './components/LockScreen';
import { Modal } from './components/Modal';
import { Toast } from './components/Toast';
import { EventForm } from './components/forms/EventForm';
import { IntakeForm } from './components/forms/IntakeForm';
import { ObservationForm } from './components/forms/ObservationForm';
import { Home } from './views/Home';
import { History } from './views/History';
import { Medications } from './views/Medications';
import { More } from './views/More';
import { ProfileSetup } from './views/ProfileSetup';
import { Report } from './views/Report';
import type { View } from './store/appStore';

const NAV: { view: View; icon: string; label: string }[] = [
  { view: 'home', icon: '📋', label: 'Heute' },
  { view: 'history', icon: '📅', label: 'Verlauf' },
  { view: 'meds', icon: '💊', label: 'Medikamente' },
  { view: 'more', icon: '⚙️', label: 'Mehr' },
];

const FORM_TITLES = { intake: 'Einnahme erfassen', event: 'Ereignis erfassen', observation: 'Zustand erfassen' } as const;

export function App() {
  const { view, setView, activeProfileId, openForm, setOpenForm, locked, reportRange } =
    useAppStore();
  const profiles = useLiveQuery(() => db.profiles.toArray(), []);

  if (locked) return <LockScreen />;
  if (!profiles) return null; // DB lädt (Millisekunden)
  if (profiles.length === 0) return <ProfileSetup />;

  const profile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
  const preset = presetFor(profile.conditions);

  // Bericht ersetzt die komplette Shell (druckfreundlich, keine Navigation)
  if (reportRange) return <Report profile={profile} preset={preset} />;

  return (
    <>
      <header className="app-header">
        <h1>care-diary</h1>
        <span className="profile-badge">👤 {profile.name}</span>
      </header>

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
        </Modal>
      )}

      <Toast />

      <nav className="bottom-nav">
        {NAV.map((item) => (
          <button
            key={item.view}
            className={view === item.view ? 'active' : ''}
            onClick={() => setView(item.view)}
          >
            <span className="icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    </>
  );
}
