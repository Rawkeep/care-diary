// Einzelnen Zustands-Eintrag bearbeiten (Parameter fest, Wert/Zeit/Notiz
// änderbar) — das Mehrfach-Erfassen bleibt im ObservationForm.
import { useState } from 'react';
import { db } from '../../db/db';
import type { Observation } from '../../db/models';
import type { ConditionPreset } from '../../presets/epilepsy';
import { fromLocalInputValue, toLocalInputValue } from '../../utils/date';

type ScaleValue = 1 | 2 | 3 | 4 | 5;

export function ObservationEditForm({
  existing,
  preset,
  onDone,
}: {
  existing: Observation;
  preset: ConditionPreset;
  onDone: () => void;
}) {
  const param = preset.observationParams.find((p) => p.key === existing.parameter);
  const [value, setValue] = useState<ScaleValue>(existing.value);
  const [at, setAt] = useState(toLocalInputValue(new Date(existing.at)));
  const [note, setNote] = useState(existing.note ?? '');

  async function save() {
    await db.observations.put({
      ...existing,
      value,
      at: fromLocalInputValue(at),
      note: note.trim() || undefined,
    });
    onDone();
  }

  return (
    <div>
      <label className="field"><span>{param?.label ?? existing.parameter}</span></label>
      <div className="scale" role="radiogroup" aria-label={param?.label ?? existing.parameter}>
        {([1, 2, 3, 4, 5] as const).map((v) => (
          <button key={v} className={value === v ? 'selected' : ''} onClick={() => setValue(v)}>
            {v}
          </button>
        ))}
      </div>
      {param && (
        <div className="scale-hint"><span>{param.scaleHint[0]}</span><span>{param.scaleHint[1]}</span></div>
      )}
      <label className="field" style={{ marginTop: 12 }}>
        <span>Zeitpunkt</span>
        <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
      </label>
      <label className="field">
        <span>Notiz (optional)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button className="btn" onClick={save}>Speichern</button>
    </div>
  );
}
