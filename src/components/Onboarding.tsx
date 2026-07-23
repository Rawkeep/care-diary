// Mini-Anleitung beim ersten Start: vier Karten, einfache Sprache, große
// Symbole — überspringbar und unter „Mehr" jederzeit wieder aufrufbar.
import { useState } from 'react';
import { IconEvent, IconHistory, IconPill, IconToday } from './icons';

export const ONBOARDING_KEY = 'care-diary.onboarded';

export function needsOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) !== 'done';
}

export function markOnboarded(): void {
  localStorage.setItem(ONBOARDING_KEY, 'done');
}

const STEPS = [
  {
    icon: <IconEvent size={52} />,
    tone: 'danger',
    title: 'Der rote Knopf',
    text:
      'Passiert etwas? Einmal drücken — die Uhr läuft mit. Video, Foto oder Sprachnotiz starten direkt darunter. Danach auf den Knopf tippen und speichern. Fertig.',
  },
  {
    icon: <IconPill size={52} />,
    tone: 'accent',
    title: 'Ein Tipp am Tag',
    text:
      'Medikament genommen? Ein Tipp auf den grünen Knopf — die App weiß Dosis und Uhrzeit. Falsch getippt? Unten erscheint „Rückgängig". Die App erinnert auch, was heute noch offen ist.',
  },
  {
    icon: <IconHistory size={52} />,
    tone: 'accent',
    title: 'Alles auf einen Blick',
    text:
      'Unter „Verlauf" werden aus deinen Einträgen Kurven und Muster. Unter „Mehr" gibt es den Arztbericht, den Bericht für Schule & Familie und die Notfallkarte fürs Portemonnaie.',
  },
  {
    icon: <IconToday size={52} />,
    tone: 'accent',
    title: 'Deine Daten gehören dir',
    text:
      'Alles bleibt auf diesem Gerät — kein Konto, keine Cloud. Mach unter „Mehr" regelmäßig ein Backup mit Passphrase (und merk sie dir gut).',
  },
];

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  function finish() {
    markOnboarded();
    onDone();
  }

  return (
    <div className="onboarding" role="dialog" aria-label="Kurzanleitung">
      <div className={`ob-card tone-${s.tone}`}>
        <div className="ob-icon">{s.icon}</div>
        <h2 className="ob-title">{s.title}</h2>
        <p className="ob-text">{s.text}</p>
        <div className="ob-dots" aria-label={`Schritt ${step + 1} von ${STEPS.length}`}>
          {STEPS.map((_, i) => (
            <span key={i} className={i === step ? 'dot active' : 'dot'} />
          ))}
        </div>
        <button className="btn" onClick={() => (last ? finish() : setStep(step + 1))}>
          {last ? 'Los geht’s!' : 'Weiter'}
        </button>
        {!last && (
          <button className="btn secondary" onClick={finish}>
            Überspringen
          </button>
        )}
      </div>
    </div>
  );
}
