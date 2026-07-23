// Mehr: Arztbericht, Fragen-Merkliste, App-Sperre, Profil, Export, Datenschutz.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { buildExportBundle, db } from '../db/db';
import type { Profile } from '../db/models';
import { newId, nowIso } from '../db/models';
import { useAppStore } from '../store/appStore';
import { dayKeyDaysAgo, localDayKey } from '../utils/date';
import { clearPin, hasPin, setPin, verifyPin } from '../utils/pin';

export function More({ profile }: { profile: Profile }) {
  const { openReport, lock } = useAppStore();

  const questions = useLiveQuery(
    () => db.questions.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const openQuestions = (questions ?? [])
    .filter((q) => !q.resolvedAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const [questionText, setQuestionText] = useState('');
  const [pinSet, setPinSet] = useState(hasPin());
  const [pinMode, setPinMode] = useState<'none' | 'set' | 'remove'>('none');
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [pinError, setPinError] = useState('');

  const today = localDayKey(new Date().toISOString());
  const report = (days: number | null) =>
    openReport({ from: days === null ? '1900-01-01' : dayKeyDaysAgo(days), to: today });

  async function addQuestion() {
    if (!questionText.trim()) return;
    await db.questions.add({
      id: newId(),
      profileId: profile.id,
      text: questionText.trim(),
      createdAt: nowIso(),
    });
    setQuestionText('');
  }

  async function resolveQuestion(id: string) {
    await db.questions.update(id, { resolvedAt: nowIso() });
  }

  async function savePin() {
    if (pin1.length < 4) return setPinError('Mindestens 4 Zeichen.');
    if (pin1 !== pin2) return setPinError('PINs stimmen nicht überein.');
    await setPin(pin1);
    setPinSet(true);
    setPinMode('none');
    setPin1('');
    setPin2('');
    setPinError('');
  }

  async function removePin() {
    if (await verifyPin(pin1)) {
      clearPin();
      setPinSet(false);
      setPinMode('none');
      setPin1('');
      setPinError('');
    } else {
      setPinError('Falsche PIN.');
    }
  }

  async function exportJson() {
    const bundle = await buildExportBundle();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `care-diary-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="card">
        <h2>Arztbericht</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Strukturierter Verlaufsbericht zum Ausdrucken oder als PDF — inklusive
          Ereignis-Kalender, Medikationsverlauf und offener Fragen.
        </p>
        <div className="quick-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
          <button className="quick-btn" onClick={() => report(28)}>📄 Letzte 4 Wochen</button>
          <button className="quick-btn" onClick={() => report(91)}>📄 Letzte 3 Monate</button>
          <button className="quick-btn" onClick={() => report(182)}>📄 Letzte 6 Monate</button>
          <button className="quick-btn" onClick={() => report(null)}>📄 Gesamter Verlauf</button>
        </div>
      </div>

      <div className="card">
        <h2>Fragen für den nächsten Termin</h2>
        {openQuestions.map((q) => (
          <div key={q.id} className="entry kind-observation">
            <div className="body">
              <div className="title" style={{ fontWeight: 400 }}>{q.text}</div>
            </div>
            <button
              className="btn secondary"
              style={{ width: 'auto', padding: '6px 10px', marginTop: 0 }}
              onClick={() => resolveQuestion(q.id)}
              aria-label="Frage als besprochen markieren"
            >
              ✓
            </button>
          </div>
        ))}
        <label className="field" style={{ marginTop: 8 }}>
          <span>Neue Frage notieren</span>
          <input
            type="text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
            placeholder="z. B. Dosis anpassen? Nebenwirkung XY normal?"
          />
        </label>
        <button className="btn secondary" onClick={addQuestion} disabled={questionText.trim() === ''}>
          ＋ Frage hinzufügen
        </button>
      </div>

      <div className="card">
        <h2>App-Sperre (PIN)</h2>
        {pinMode === 'set' && (
          <>
            <label className="field">
              <span>Neue PIN (mind. 4 Zeichen)</span>
              <input type="password" inputMode="numeric" value={pin1} onChange={(e) => setPin1(e.target.value)} />
            </label>
            <label className="field">
              <span>PIN wiederholen</span>
              <input type="password" inputMode="numeric" value={pin2} onChange={(e) => setPin2(e.target.value)} />
            </label>
            {pinError && <p className="hint" style={{ color: 'var(--danger)' }}>{pinError}</p>}
            <button className="btn" onClick={savePin}>PIN speichern</button>
            <button className="btn secondary" onClick={() => { setPinMode('none'); setPinError(''); }}>Abbrechen</button>
          </>
        )}
        {pinMode === 'remove' && (
          <>
            <label className="field">
              <span>Aktuelle PIN eingeben</span>
              <input type="password" inputMode="numeric" value={pin1} onChange={(e) => setPin1(e.target.value)} />
            </label>
            {pinError && <p className="hint" style={{ color: 'var(--danger)' }}>{pinError}</p>}
            <button className="btn danger" onClick={removePin}>PIN entfernen</button>
            <button className="btn secondary" onClick={() => { setPinMode('none'); setPinError(''); }}>Abbrechen</button>
          </>
        )}
        {pinMode === 'none' && (
          <>
            <p className="hint" style={{ marginTop: 0 }}>
              Schützt die App vor neugierigen Blicken auf einem geteilten Gerät. Beim nächsten
              Öffnen wird die PIN abgefragt. (Die Daten selbst bleiben unverschlüsselt lokal.)
            </p>
            {pinSet ? (
              <>
                <button className="btn" onClick={lock}>🔒 Jetzt sperren</button>
                <button className="btn secondary" onClick={() => { setPinMode('set'); setPin1(''); setPin2(''); }}>PIN ändern</button>
                <button className="btn secondary" onClick={() => { setPinMode('remove'); setPin1(''); }}>PIN entfernen</button>
              </>
            ) : (
              <button className="btn" onClick={() => { setPinMode('set'); setPin1(''); setPin2(''); }}>PIN einrichten</button>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2>Profil</h2>
        <p style={{ margin: '4px 0' }}>
          <strong>{profile.name}</strong>
          {profile.birthDate ? ` · geboren ${profile.birthDate}` : ''}
        </p>
        <p className="hint">
          Aktivierte Module: {profile.conditions.length > 0 ? profile.conditions.join(', ') : 'Allgemein'}
        </p>
      </div>

      <div className="card">
        <h2>Datenexport</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Alle Daten als JSON-Datei sichern (Backup) — z. B. vor einem Gerätewechsel.
        </p>
        <button className="btn" onClick={exportJson}>⬇ Alle Daten exportieren (JSON)</button>
      </div>

      <div className="card">
        <h2>Datenschutz</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          care-diary speichert alle Angaben ausschließlich lokal auf diesem Gerät (IndexedDB).
          Es gibt kein Konto, keine Cloud und keine Datenübertragung an Dritte.
        </p>
        <p className="hint">
          Diese App dokumentiert Beobachtungen und ersetzt keine ärztliche Beratung, Diagnose
          oder Therapieentscheidung.
        </p>
      </div>

      <p className="hint" style={{ textAlign: 'center' }}>care-diary v0.2.0 (MVP)</p>
    </>
  );
}
