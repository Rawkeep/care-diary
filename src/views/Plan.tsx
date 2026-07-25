// Plan — die Heimat der Begleit-Module: erst die proaktiven Hinweise, dann je
// aktiviertem Modul ein Bereich. Der Tab erscheint nur, wenn mindestens ein
// Modul aktiviert ist; wer nichts davon braucht, sieht die App wie vorher.
import type { Profile } from '../db/models';
import { AgendaCards } from '../components/AgendaCards';
import { AppointmentPanel } from '../components/plan/AppointmentPanel';
import { NutritionPanel } from '../components/plan/NutritionPanel';
import { PrescriptionPanel } from '../components/plan/PrescriptionPanel';
import { StockPanel } from '../components/plan/StockPanel';
import { enabledModules, type ModuleKey } from '../modules/registry';
import { useAgenda } from '../modules/useAgenda';
import { useAppStore } from '../store/appStore';

const PANELS: Record<ModuleKey, (p: { profile: Profile }) => JSX.Element | null> = {
  prescriptions: PrescriptionPanel,
  stock: StockPanel,
  appointments: AppointmentPanel,
  nutrition: NutritionPanel,
};

export function Plan({ profile }: { profile: Profile }) {
  const setView = useAppStore((s) => s.setView);
  const agenda = useAgenda(profile);
  const active = enabledModules(profile.modules);

  if (active.length === 0) {
    return (
      <div className="card">
        <h2>Keine Begleit-Module aktiv</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Verordnungen, Bestand, Termine und Ernährung lassen sich einzeln unter „Mehr →
          Module" einschalten — je nachdem, was gerade Arbeit macht.
        </p>
        <button className="btn" onClick={() => setView('more')}>
          Module auswählen
        </button>
      </div>
    );
  }

  return (
    <>
      <AgendaCards items={agenda} title="Im Blick behalten" />
      {agenda.length === 0 && (
        <div className="card">
          <h2>Alles im Plan</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            Gerade steht nichts an: keine Frist läuft ab, kein Vorrat wird knapp, kein Termin
            drängt. Die App meldet sich, wenn sich das ändert.
          </p>
        </div>
      )}

      {active.map((m) => {
        const Panel = PANELS[m.key];
        return (
          <details key={m.key} className="group" open={active.length === 1}>
            <summary>{m.label}</summary>
            <Panel profile={profile} />
          </details>
        );
      })}

      <p className="hint" style={{ textAlign: 'center' }}>
        Module ein- und ausschalten: „Mehr → Module". Ausschalten verbirgt nur — die Daten
        bleiben erhalten.
      </p>
    </>
  );
}
