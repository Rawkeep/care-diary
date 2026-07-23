// Medikamentenverwaltung: anlegen, absetzen (Historie bleibt erhalten) und
// Dosisänderungs-Plan (z. B. stufenweises Herabsetzen) — die App dokumentiert
// die ärztliche Verordnung und zeigt die aktuell gültige Stufe; sie rechnet
// selbst keine Pläne aus.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Medication, Profile } from '../db/models';
import { newId, nowIso } from '../db/models';
import { effectiveDose } from '../utils/dose';
import { fmtDayKey, localDayKey } from '../utils/date';

export function Medications({ profile }: { profile: Profile }) {
  const medications = useLiveQuery(
    () => db.medications.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [substance, setSubstance] = useState('');
  const [dose, setDose] = useState('');
  const [unit, setUnit] = useState('mg');
  const [schedule, setSchedule] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);

  const [planFor, setPlanFor] = useState<string | null>(null);
  const [stepDate, setStepDate] = useState(localDayKey(new Date().toISOString()));
  const [stepDose, setStepDose] = useState('');
  const [stepNote, setStepNote] = useState('');

  async function add() {
    await db.medications.add({
      id: newId(),
      profileId: profile.id,
      name: name.trim(),
      substance: substance.trim() || undefined,
      dose: Number(dose),
      unit,
      schedule: schedule.trim() || undefined,
      isEmergency,
      startDate: nowIso().slice(0, 10),
      createdAt: nowIso(),
    });
    setName(''); setSubstance(''); setDose(''); setSchedule(''); setIsEmergency(false);
    setShowForm(false);
  }

  async function endMedication(id: string) {
    // Absetzen statt löschen — die Medikationshistorie ist Teil der Doku
    await db.medications.update(id, { endDate: nowIso().slice(0, 10) });
  }

  async function addStep(med: Medication) {
    const steps = [
      ...(med.doseSteps ?? []),
      { fromDate: stepDate, dose: Number(stepDose), note: stepNote.trim() || undefined },
    ].sort((a, b) => a.fromDate.localeCompare(b.fromDate));
    await db.medications.update(med.id, { doseSteps: steps });
    setStepDose('');
    setStepNote('');
  }

  async function removeStep(med: Medication, index: number) {
    const steps = (med.doseSteps ?? []).filter((_, i) => i !== index);
    await db.medications.update(med.id, { doseSteps: steps });
  }

  if (!medications) return null;
  const active = medications.filter((m) => !m.endDate);
  const ended = medications.filter((m) => m.endDate);

  return (
    <>
      <div className="card">
        <h2>Aktuelle Medikamente</h2>
        {active.length === 0 && <p className="empty">Noch keine Medikamente angelegt.</p>}
        {active.map((m) => {
          const steps = m.doseSteps ?? [];
          const current = effectiveDose(m, new Date().toISOString());
          return (
            <div key={m.id} style={{ marginBottom: 6 }}>
              <div className="entry kind-intake" style={{ marginBottom: 0 }}>
                <div className="body">
                  <div className="title">
                    {m.isEmergency ? '🚨 ' : '💊 '}{m.name}
                  </div>
                  <div className="meta">
                    {steps.length > 0 ? `aktuell ${current} ${m.unit} (Basis ${m.dose})` : `${m.dose} ${m.unit}`}
                    {m.schedule ? ` · Schema ${m.schedule}` : ''}
                    {m.substance ? ` · ${m.substance}` : ''}
                    {m.startDate ? ` · seit ${m.startDate}` : ''}
                  </div>
                </div>
                <button className="btn secondary" style={{ width: 'auto', padding: '8px 12px', marginTop: 0 }}
                  onClick={() => setPlanFor(planFor === m.id ? null : m.id)}>
                  Plan
                </button>
                <button className="btn secondary" style={{ width: 'auto', padding: '8px 12px', marginTop: 0 }}
                  onClick={() => endMedication(m.id)}>
                  Absetzen
                </button>
              </div>

              {planFor === m.id && (
                <div className="card" style={{ marginTop: 6 }}>
                  <h2>Dosisänderungs-Plan</h2>
                  <p className="hint" style={{ marginTop: 0 }}>
                    Vom Arzt verordnete Stufen dokumentieren — z. B. stufenweises Herabsetzen.
                    Die App übernimmt ab dem jeweiligen Datum automatisch die passende
                    Standarddosis bei der Einnahme-Erfassung. Sie berechnet selbst keine Pläne.
                  </p>
                  {steps.length === 0 && <p className="empty">Noch keine Stufen hinterlegt.</p>}
                  {steps.map((s, idx) => (
                    <div key={`${s.fromDate}-${idx}`} className="entry kind-intake">
                      <div className="body">
                        <div className="title">ab {fmtDayKey(s.fromDate)}: {s.dose} {m.unit}</div>
                        {s.note && <div className="meta">{s.note}</div>}
                      </div>
                      <button className="btn secondary"
                        style={{ width: 'auto', padding: '6px 10px', marginTop: 0 }}
                        onClick={() => removeStep(m, idx)} aria-label="Stufe entfernen">
                        🗑
                      </button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label className="field" style={{ flex: 1 }}>
                      <span>Gültig ab</span>
                      <input type="date" value={stepDate} onChange={(e) => setStepDate(e.target.value)} />
                    </label>
                    <label className="field" style={{ flex: 1 }}>
                      <span>Dosis ({m.unit})</span>
                      <input type="number" inputMode="decimal" min="0" step="any" value={stepDose}
                        onChange={(e) => setStepDose(e.target.value)} />
                    </label>
                  </div>
                  <label className="field">
                    <span>Notiz (optional, z. B. „lt. Dr. Weber, Kontrolle in 4 Wochen")</span>
                    <input type="text" value={stepNote} onChange={(e) => setStepNote(e.target.value)} />
                  </label>
                  <button className="btn" onClick={() => addStep(m)}
                    disabled={stepDate === '' || !Number.isFinite(Number(stepDose)) || stepDose === '' || Number(stepDose) < 0}>
                    Stufe hinzufügen
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm ? (
        <div className="card">
          <h2>Neues Medikament</h2>
          <label className="field">
            <span>Name *</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Levetiracetam" />
          </label>
          <label className="field">
            <span>Wirkstoff (optional)</span>
            <input type="text" value={substance} onChange={(e) => setSubstance(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <label className="field" style={{ flex: 1 }}>
              <span>Einzeldosis *</span>
              <input type="number" inputMode="decimal" min="0" step="any" value={dose}
                onChange={(e) => setDose(e.target.value)} />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Einheit</span>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                {['mg', 'ml', 'Tropfen', 'Tablette(n)', 'µg', 'IE'].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>Einnahmeschema (optional, z. B. „1-0-1")</span>
            <input type="text" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
          </label>
          <label className="check-row">
            <input type="checkbox" checked={isEmergency} onChange={(e) => setIsEmergency(e.target.checked)} />
            Bedarfs-/Notfallmedikation
          </label>
          <button className="btn" onClick={add} disabled={name.trim() === '' || !Number.isFinite(Number(dose)) || Number(dose) <= 0}>
            Medikament anlegen
          </button>
          <button className="btn secondary" onClick={() => setShowForm(false)}>Abbrechen</button>
        </div>
      ) : (
        <button className="btn" onClick={() => setShowForm(true)}>＋ Medikament hinzufügen</button>
      )}

      {ended.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <h2>Abgesetzte Medikamente (Historie)</h2>
          {ended.map((m) => (
            <div key={m.id} className="entry kind-intake med-ended">
              <div className="body">
                <div className="title">💊 {m.name}</div>
                <div className="meta">
                  {m.dose} {m.unit}
                  {m.startDate ? ` · ${m.startDate}` : ''} bis {m.endDate}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
