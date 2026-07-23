// Mehr: Arztbericht, Fragen-Merkliste, App-Sperre, Profil, Sicherung, Datenschutz.
import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { buildExportBundle, db, importBundle } from '../db/db';
import type { Profile } from '../db/models';
import { newId, nowIso } from '../db/models';
import { useAppStore } from '../store/appStore';
import { REMINDER_PREF_KEY, remindersEnabled } from '../components/ReminderManager';
import { decryptBackup, encryptBackup, isBackupEnvelope } from '../utils/backup';
import { dayKeyDaysAgo, localDayKey } from '../utils/date';
import { clearPin, hasPin, setPin, verifyPin } from '../utils/pin';
import { parseExportBundle } from '../utils/bundle';
import { APP_VERSION } from '../version';

function downloadFile(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function More({ profile }: { profile: Profile }) {
  const { openReport, lock, showToast } = useAppStore();

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

  // --- Erinnerungen ---
  const [remindersOn, setRemindersOn] = useState(remindersEnabled());
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  function toggleReminders(on: boolean) {
    localStorage.setItem(REMINDER_PREF_KEY, on ? 'on' : 'off');
    setRemindersOn(on);
  }

  async function requestNotifications() {
    if (typeof Notification === 'undefined') return;
    setNotifPermission(await Notification.requestPermission());
  }

  // --- Sicherung & Wiederherstellung ---
  const [backupPass, setBackupPass] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);
  const [restoreText, setRestoreText] = useState<string | null>(null);
  const [restoreNeedsPass, setRestoreNeedsPass] = useState(false);
  const [restorePass, setRestorePass] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const stamp = () => new Date().toISOString().slice(0, 10);

  async function exportJson() {
    const bundle = await buildExportBundle();
    downloadFile(JSON.stringify(bundle, null, 2), `care-diary-export-${stamp()}.json`, 'application/json');
  }

  async function exportEncrypted() {
    if (backupPass.length < 8) return;
    setBackupBusy(true);
    try {
      const bundle = await buildExportBundle();
      const envelope = await encryptBackup(JSON.stringify(bundle), backupPass, nowIso());
      downloadFile(JSON.stringify(envelope), `care-diary-backup-${stamp()}.cdbak`, 'application/json');
      setBackupPass('');
      showToast('✓ Verschlüsseltes Backup erstellt');
    } finally {
      setBackupBusy(false);
    }
  }

  function pickRestoreFile(file: File | undefined) {
    if (!file) return;
    setRestoreError('');
    setRestorePass('');
    file.text().then((text) => {
      setRestoreText(text);
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        /* Fehlermeldung kommt beim Wiederherstellen aus parseExportBundle */
      }
      setRestoreNeedsPass(isBackupEnvelope(parsed));
    });
  }

  async function restore() {
    if (restoreText == null) return;
    setRestoreError('');
    try {
      let jsonText = restoreText;
      if (restoreNeedsPass) {
        const envelope = JSON.parse(restoreText);
        jsonText = await decryptBackup(envelope, restorePass);
      }
      const bundle = parseExportBundle(jsonText);
      const count =
        bundle.intakes.length + bundle.events.length + bundle.observations.length;
      if (!window.confirm(
        `Backup vom ${bundle.exportedAt.slice(0, 10)} mit ${count} Einträgen einspielen?\n` +
        'Gleiche Einträge werden überschrieben, alles andere bleibt erhalten.'
      )) return;
      await importBundle(bundle);
      setRestoreText(null);
      setRestorePass('');
      showToast('✓ Daten wiederhergestellt');
    } catch (err) {
      setRestoreError(err instanceof Error ? err.message : 'Wiederherstellung fehlgeschlagen.');
    }
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
        <h2>Erinnerungen</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Sanfte Einnahme-Erinnerung aus dem Schema („1-0-1"): Tagesstatus auf den
          Medikamenten-Buttons, App-Badge mit offenen Einnahmen (installierte App) und —
          wenn erlaubt — eine Benachrichtigung je fälligem Zeitpunkt (morgens 8 Uhr,
          mittags 13 Uhr, abends 19 Uhr), solange die App geöffnet ist.
        </p>
        <label className="check-row">
          <input
            type="checkbox"
            checked={remindersOn}
            onChange={(e) => toggleReminders(e.target.checked)}
          />
          Erinnerungen aktiv
        </label>
        {notifPermission === 'default' && (
          <button className="btn secondary" onClick={requestNotifications}>
            🔔 Benachrichtigungen erlauben
          </button>
        )}
        {notifPermission === 'granted' && (
          <p className="hint">🔔 Benachrichtigungen sind erlaubt.</p>
        )}
        {notifPermission === 'denied' && (
          <p className="hint">
            Benachrichtigungen sind im Browser blockiert — in den Website-Einstellungen
            freigeben, falls gewünscht.
          </p>
        )}
        <p className="hint">
          Ehrlich gesagt: Push bei komplett geschlossener App kann eine reine Web-App ohne
          Server nicht — das kommt mit den geplanten nativen Builds (iOS/Android).
        </p>
      </div>

      <div className="card">
        <h2>Sicherung (Backup)</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Empfohlen: verschlüsseltes Backup mit Passphrase (AES-256). Die Datei kann
          bedenkenlos in einer Cloud oder per Mail abgelegt werden — lesbar ist sie
          nur mit der Passphrase. <strong>Passphrase gut merken, sie ist nicht wiederherstellbar.</strong>
        </p>
        <label className="field">
          <span>Passphrase (mind. 8 Zeichen)</span>
          <input
            type="password"
            value={backupPass}
            onChange={(e) => setBackupPass(e.target.value)}
            placeholder="z. B. drei-woerter-die-du-nie-vergisst"
          />
        </label>
        <button className="btn" onClick={exportEncrypted} disabled={backupPass.length < 8 || backupBusy}>
          {backupBusy ? 'Verschlüsselt …' : '🔐 Verschlüsseltes Backup erstellen (.cdbak)'}
        </button>
        <button className="btn secondary" onClick={exportJson}>
          ⬇ Unverschlüsselter Export (JSON)
        </button>
      </div>

      <div className="card">
        <h2>Wiederherstellen</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Backup-Datei (.cdbak) oder JSON-Export einspielen — z. B. nach einem
          Gerätewechsel. Gleiche Einträge werden überschrieben, alles andere bleibt.
        </p>
        <button className="btn secondary" onClick={() => restoreInputRef.current?.click()}>
          📂 Datei auswählen
        </button>
        <input
          ref={restoreInputRef}
          type="file"
          accept=".cdbak,.json,application/json"
          hidden
          onChange={(e) => {
            pickRestoreFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {restoreText != null && (
          <>
            {restoreNeedsPass && (
              <label className="field" style={{ marginTop: 10 }}>
                <span>Passphrase des Backups</span>
                <input
                  type="password"
                  value={restorePass}
                  onChange={(e) => setRestorePass(e.target.value)}
                />
              </label>
            )}
            {restoreError && <p className="hint" style={{ color: 'var(--danger)' }}>{restoreError}</p>}
            <button
              className="btn"
              onClick={restore}
              disabled={restoreNeedsPass && restorePass === ''}
            >
              Wiederherstellen
            </button>
            <button className="btn secondary" onClick={() => { setRestoreText(null); setRestoreError(''); }}>
              Abbrechen
            </button>
          </>
        )}
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

      <p className="hint" style={{ textAlign: 'center' }}>care-diary v{APP_VERSION}</p>
    </>
  );
}
