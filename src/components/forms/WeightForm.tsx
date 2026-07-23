// Gewichts-Erfassung — schneller Messwert (z. B. zur Beobachtung von
// Gewichtszunahme unter einem Medikament). Nur Wert + Zeitpunkt, fertig.
import { useState } from 'react';
import { db } from '../../db/db';
import type { Profile } from '../../db/models';
import { newId, nowIso } from '../../db/models';
import { fromLocalInputValue, toLocalInputValue } from '../../utils/date';
import { IconClock, IconNote, IconWeight } from '../icons';

export function WeightForm({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [value, setValue] = useState('');
  const [at, setAt] = useState(toLocalInputValue(new Date()));
  const [note, setNote] = useState('');

  const parsed = Number(value.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed > 0;

  async function save() {
    await db.measurements.add({
      id: newId(),
      profileId: profile.id,
      kind: 'weight',
      value: parsed,
      unit: 'kg',
      at: fromLocalInputValue(at),
      note: note.trim() || undefined,
      createdAt: nowIso(),
    });
    onDone();
  }

  return (
    <div>
      <label className="field">
        <span><IconWeight size={16} className="inline-icon" /> Gewicht (kg)</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="z. B. 42,5"
          autoFocus
        />
      </label>
      <label className="field">
        <span><IconClock size={16} className="inline-icon" /> Zeitpunkt</span>
        <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
      </label>
      <label className="field">
        <span><IconNote size={16} className="inline-icon" /> Notiz (optional, z. B. „nach dem Frühstück gewogen")</span>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <p className="hint">
        Regelmäßig unter gleichen Bedingungen wiegen (z. B. morgens) macht den Verlauf
        aussagekräftiger — sichtbar unter „Verlauf" und im Arztbericht.
      </p>
      <button className="btn" onClick={save} disabled={!valid}>
        Speichern
      </button>
    </div>
  );
}
