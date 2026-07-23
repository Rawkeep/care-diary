// Zustands-Erfassung: je Parameter eine 1–5-Skala; nur berührte Parameter
// werden gespeichert (keine Pflichtfelder — Lücken sind okay).
import { useState } from 'react';
import { saveAttachments } from '../../db/attachments';
import { db } from '../../db/db';
import type { Observation, Profile } from '../../db/models';
import { newId, nowIso } from '../../db/models';
import type { ConditionPreset } from '../../presets/epilepsy';
import { fromLocalInputValue, toLocalInputValue } from '../../utils/date';
import { AudioRecorder } from '../AudioRecorder';
import { IconClock, IconNote } from '../icons';
import { PhotoPicker } from '../PhotoPicker';

type ScaleValue = 1 | 2 | 3 | 4 | 5;

export function ObservationForm({
  profile,
  preset,
  onDone,
}: {
  profile: Profile;
  preset: ConditionPreset;
  onDone: () => void;
}) {
  const [values, setValues] = useState<Record<string, ScaleValue>>({});
  const [at, setAt] = useState(toLocalInputValue(new Date()));
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [audioClips, setAudioClips] = useState<Blob[]>([]);
  const [saving, setSaving] = useState(false);

  function toggle(param: string, v: ScaleValue) {
    setValues((prev) => {
      const next = { ...prev };
      if (next[param] === v) delete next[param];
      else next[param] = v;
      return next;
    });
  }

  const touched = Object.keys(values);

  async function save() {
    setSaving(true);
    const atIso = fromLocalInputValue(at);
    const createdAt = nowIso();
    const rows: Observation[] = touched.map((param, idx) => ({
      id: newId(),
      profileId: profile.id,
      parameter: param,
      value: values[param],
      at: atIso,
      // Notiz nur am ersten Eintrag, damit sie nicht dupliziert wird
      note: idx === 0 && note.trim() ? note.trim() : undefined,
      createdAt,
    }));
    await db.observations.bulkAdd(rows);
    // Anhänge (Fotos/Sprachnotizen) hängen am ersten Eintrag (wie die Notiz)
    await saveAttachments(profile.id, 'observation', rows[0].id, [...photos, ...audioClips]);
    onDone();
  }

  return (
    <div>
      {preset.observationParams.map((p) => (
        <div key={p.key} style={{ marginBottom: 14 }}>
          <label className="field"><span>{p.label}</span></label>
          <div className="scale" role="radiogroup" aria-label={p.label}>
            {([1, 2, 3, 4, 5] as const).map((v) => (
              <button key={v} className={values[p.key] === v ? 'selected' : ''}
                onClick={() => toggle(p.key, v)}>
                {v}
              </button>
            ))}
          </div>
          <div className="scale-hint"><span>{p.scaleHint[0]}</span><span>{p.scaleHint[1]}</span></div>
        </div>
      ))}

      <label className="field">
        <span><IconClock size={16} className="inline-icon" /> Zeitpunkt</span>
        <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
      </label>
      <label className="field">
        <span><IconNote size={16} className="inline-icon" /> Auffälligkeit / Notiz (optional)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="z. B. heute auffällig müde, neue Nebenwirkung beobachtet …" />
      </label>

      <PhotoPicker files={photos} onChange={setPhotos} />
      <AudioRecorder clips={audioClips} onChange={setAudioClips} />

      <button className="btn" onClick={save} disabled={touched.length === 0 || saving}>
        {touched.length === 0
          ? 'Mindestens einen Wert wählen'
          : saving
            ? 'Speichert …'
            : `Speichern (${touched.length})`}
      </button>
    </div>
  );
}
