// Ereignis-Erfassung — im Akutfall vorbefüllt aus dem Timer (Start + Dauer),
// Details werden in Ruhe ergänzt. Nur Typ + Zeitpunkt sind Pflicht.
import { useState } from 'react';
import { saveAttachments } from '../../db/attachments';
import { db } from '../../db/db';
import type { HealthEvent, Profile } from '../../db/models';
import { newId, nowIso } from '../../db/models';
import type { ConditionPreset } from '../../presets/epilepsy';
import { useAppStore } from '../../store/appStore';
import { fromLocalInputValue, toLocalInputValue } from '../../utils/date';
import { AudioRecorder } from '../AudioRecorder';
import { PhotoPicker } from '../PhotoPicker';

export function EventForm({
  profile,
  preset,
  existing,
  onDone,
}: {
  profile: Profile;
  preset: ConditionPreset;
  /** gesetzt = bestehendes Ereignis bearbeiten statt neu anlegen */
  existing?: HealthEvent;
  onDone: () => void;
}) {
  const { acuteStartedAt, clearAcute, acuteMedia } = useAppStore();
  const acuteDuration = !existing && acuteStartedAt
    ? Math.max(1, Math.round((Date.now() - new Date(acuteStartedAt).getTime()) / 1000))
    : null;
  const existingDuration = existing?.durationSeconds ?? null;

  const [type, setType] = useState(existing?.type ?? preset.eventTypes[0].key);
  const [startedAt, setStartedAt] = useState(
    toLocalInputValue(
      existing ? new Date(existing.startedAt) : acuteStartedAt ? new Date(acuteStartedAt) : new Date()
    )
  );
  const initialDuration = existingDuration ?? acuteDuration;
  const [minutes, setMinutes] = useState(initialDuration ? String(Math.floor(initialDuration / 60)) : '');
  const [seconds, setSeconds] = useState(initialDuration ? String(initialDuration % 60) : '');
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5 | undefined>(existing?.severity);
  const [circumstances, setCircumstances] = useState<string[]>(existing?.circumstances ?? []);
  const [aura, setAura] = useState(existing?.aura ?? false);
  const [emergencyMed, setEmergencyMed] = useState(existing?.emergencyMedicationGiven ?? false);
  const [postPhase, setPostPhase] = useState(
    existing?.postPhaseMinutes != null ? String(existing.postPhaseMinutes) : ''
  );
  const [note, setNote] = useState(existing?.note ?? '');
  // Während des Akut-Timers aufgenommene Medien sind schon da (Aufnahme
  // zuerst) — Fotos/Videos und Sprachnotizen getrennt einsortiert
  const [photos, setPhotos] = useState<File[]>(
    existing ? [] : acuteMedia.filter((f) => !f.type.startsWith('audio/'))
  );
  const [audioClips, setAudioClips] = useState<Blob[]>(
    existing ? [] : acuteMedia.filter((f) => f.type.startsWith('audio/'))
  );
  const [saving, setSaving] = useState(false);
  // Kurz-Modus beim Neu-Erfassen: erst Art + Zeit, Details auf Wunsch —
  // im Stress zählt Speichern, nicht Vollständigkeit. Bearbeiten zeigt alles.
  const [detailed, setDetailed] = useState(Boolean(existing));

  function toggleCircumstance(c: string) {
    setCircumstances((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function save() {
    setSaving(true);
    const totalSeconds = Number(minutes || 0) * 60 + Number(seconds || 0);
    const id = existing?.id ?? newId();
    await db.events.put({
      id,
      profileId: profile.id,
      type,
      startedAt: fromLocalInputValue(startedAt),
      durationSeconds: totalSeconds > 0 ? totalSeconds : undefined,
      severity,
      circumstances,
      aura: aura || undefined,
      emergencyMedicationGiven: emergencyMed || undefined,
      postPhaseMinutes: postPhase !== '' ? Number(postPhase) : undefined,
      note: note.trim() || undefined,
      createdAt: existing?.createdAt ?? nowIso(),
    });
    await saveAttachments(profile.id, 'event', id, [...photos, ...audioClips]);
    if (!existing) clearAcute();
    onDone();
  }

  return (
    <div>
      <label className="field"><span>Art des Ereignisses</span></label>
      <div className="choice-list">
        {preset.eventTypes.map((t) => (
          <div
            key={t.key}
            className={`choice ${type === t.key ? 'selected' : ''}`}
            onClick={() => setType(t.key)}
            role="radio"
            aria-checked={type === t.key}
          >
            <div className="label">{t.label}</div>
            <div className="desc">{t.description}</div>
          </div>
        ))}
      </div>

      <label className="field">
        <span>Beginn</span>
        <input type="datetime-local" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} />
      </label>

      <label className="field">
        <span>Dauer (Minuten / Sekunden){acuteDuration ? ' — aus Timer übernommen' : ''}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" inputMode="numeric" min="0" placeholder="Min" value={minutes}
            onChange={(e) => setMinutes(e.target.value)} />
          <input type="number" inputMode="numeric" min="0" max="59" placeholder="Sek" value={seconds}
            onChange={(e) => setSeconds(e.target.value)} />
        </div>
      </label>

      {/* Aufnahmen sind zeitkritisch — immer sichtbar, auch im Kurz-Modus */}
      <PhotoPicker files={photos} onChange={setPhotos} />
      <AudioRecorder clips={audioClips} onChange={setAudioClips} />

      {!detailed && (
        <button type="button" className="btn secondary" onClick={() => setDetailed(true)}>
          ＋ Details hinzufügen (Schwere, Umstände, Nachphase …)
        </button>
      )}

      {detailed && (<>
      <label className="field"><span>Schweregrad (optional)</span></label>
      <div className="scale" role="radiogroup" aria-label="Schweregrad">
        {([1, 2, 3, 4, 5] as const).map((v) => (
          <button key={v} className={severity === v ? 'selected' : ''}
            onClick={() => setSeverity(severity === v ? undefined : v)}>
            {v}
          </button>
        ))}
      </div>
      <div className="scale-hint"><span>leicht</span><span>sehr schwer</span></div>

      <label className="field" style={{ marginTop: 12 }}><span>Begleitumstände (Beobachtung)</span></label>
      {preset.circumstances.map((c) => (
        <label key={c} className="check-row">
          <input type="checkbox" checked={circumstances.includes(c)} onChange={() => toggleCircumstance(c)} />
          {c}
        </label>
      ))}

      <label className="check-row">
        <input type="checkbox" checked={aura} onChange={(e) => setAura(e.target.checked)} />
        Vorboten / Aura beobachtet
      </label>
      <label className="check-row">
        <input type="checkbox" checked={emergencyMed} onChange={(e) => setEmergencyMed(e.target.checked)} />
        Notfallmedikation gegeben
      </label>

      <label className="field" style={{ marginTop: 8 }}>
        <span>Nachphase in Minuten (Schlaf/Verwirrtheit, optional)</span>
        <input type="number" inputMode="numeric" min="0" value={postPhase}
          onChange={(e) => setPostPhase(e.target.value)} />
      </label>

      <label className="field">
        <span>Notiz (optional)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Was ist passiert? Was war anders als sonst?" />
      </label>

      </>)}

      <button className="btn" onClick={save} disabled={saving}>
        {saving ? 'Speichert …' : 'Speichern'}
      </button>
      {!detailed && (
        <p className="hint">
          Art + Zeitpunkt reichen fürs Erste — Details lassen sich später über
          „Bearbeiten" im Verlauf ergänzen.
        </p>
      )}
    </div>
  );
}
