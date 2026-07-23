import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { Intake, IntakeStatus, Profile } from '../../db/models';
import { newId, nowIso } from '../../db/models';
import { effectiveDose } from '../../utils/dose';
import { IconClock, IconDone, IconGauge, IconNote, IconPill } from '../icons';
import { fromLocalInputValue, toLocalInputValue } from '../../utils/date';

const STATUS_OPTIONS: { value: IntakeStatus; label: string }[] = [
  { value: 'taken', label: 'Genommen' },
  { value: 'late', label: 'Verspätet genommen' },
  { value: 'missed', label: 'Ausgelassen' },
  { value: 'vomited', label: 'Erbrochen' },
];

export function IntakeForm({
  profile,
  existing,
  onDone,
}: {
  profile: Profile;
  /** gesetzt = bestehenden Eintrag bearbeiten statt neu anlegen */
  existing?: Intake;
  onDone: () => void;
}) {
  const medications = useLiveQuery(
    () => db.medications.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  // Beim Bearbeiten auch abgesetzte Medikamente zulassen (Historie!)
  const activeMeds = (medications ?? []).filter(
    (m) => !m.endDate || m.id === existing?.medicationId
  );

  const [medicationId, setMedicationId] = useState(existing?.medicationId ?? '');
  const [status, setStatus] = useState<IntakeStatus>(existing?.status ?? 'taken');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [at, setAt] = useState(
    toLocalInputValue(existing ? new Date(existing.at) : new Date())
  );
  const [note, setNote] = useState(existing?.note ?? '');

  if (!medications) return null;
  if (activeMeds.length === 0) {
    return (
      <p className="hint">
        Noch keine aktiven Medikamente angelegt. Bitte zuerst unter „Medikamente" eines hinzufügen.
      </p>
    );
  }

  const med = activeMeds.find((m) => m.id === medicationId) ?? activeMeds[0];
  // Standarddosis laut Dosisänderungs-Plan zum gewählten Zeitpunkt
  const plannedDose = effectiveDose(med, fromLocalInputValue(at));
  const effectiveAmount = amount === '' ? plannedDose : Number(amount);

  async function save() {
    await db.intakes.put({
      id: existing?.id ?? newId(),
      profileId: profile.id,
      medicationId: med.id,
      at: fromLocalInputValue(at),
      amount: effectiveAmount,
      unit: med.unit,
      status,
      note: note.trim() || undefined,
      createdAt: existing?.createdAt ?? nowIso(),
    });
    onDone();
  }

  return (
    <div>
      <label className="field">
        <span><IconPill size={16} className="inline-icon" /> Medikament</span>
        <select value={med.id} onChange={(e) => setMedicationId(e.target.value)}>
          {activeMeds.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.dose} {m.unit}){m.isEmergency ? ' — Notfall' : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span><IconDone size={16} className="inline-icon" /> Status</span>
        <select value={status} onChange={(e) => setStatus(e.target.value as IntakeStatus)}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span><IconGauge size={16} className="inline-icon" /> Menge ({med.unit}) — leer = Dosis laut Plan: {plannedDose}</span>
        <input type="number" inputMode="decimal" min="0" step="any" value={amount}
          onChange={(e) => setAmount(e.target.value)} placeholder={String(plannedDose)} />
      </label>
      <label className="field">
        <span><IconClock size={16} className="inline-icon" /> Zeitpunkt</span>
        <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
      </label>
      <label className="field">
        <span><IconNote size={16} className="inline-icon" /> Notiz (optional)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button className="btn" onClick={save} disabled={!Number.isFinite(effectiveAmount)}>
        Speichern
      </button>
    </div>
  );
}
