// Medikamentenverwaltung: anlegen, absetzen (Historie bleibt erhalten) und
// Dosisänderungs-Plan (z. B. stufenweises Herabsetzen) — die App dokumentiert
// die ärztliche Verordnung und zeigt die aktuell gültige Stufe; sie rechnet
// selbst keine Pläne aus.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { IconEmergency, IconGauge, IconPill, IconStop, IconStopwatch } from '../components/icons';
import { ScheduleEditor } from '../components/ScheduleEditor';
import { db } from '../db/db';
import type { Medication, Profile } from '../db/models';
import { newId, nowIso } from '../db/models';
import { effectiveDose } from '../utils/dose';
import { fmtDate, fmtDayKey, localDayKey } from '../utils/date';
import { parseSchedule } from '../utils/schedule';
import { DIRECTION_LABEL, taperInfo, taperPhases } from '../utils/taper';

const SLOT_WORDS: Record<string, string> = { morning: 'morgens', noon: 'mittags', evening: 'abends' };

/** „1-0-1" → „morgens 1 · abends 1" (lesbare Kurzform für die Liste) */
function rhythmWords(schedule?: string): string | null {
  const plan = parseSchedule(schedule);
  if (!plan) return null;
  return (['morning', 'noon', 'evening'] as const)
    .filter((k) => plan[k] > 0)
    .map((k) => `${SLOT_WORDS[k]} ${String(plan[k]).replace('.', ',')}`)
    .join(' · ');
}

export function Medications({ profile }: { profile: Profile }) {
  const medications = useLiveQuery(
    () => db.medications.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const sideEffects = useLiveQuery(
    () => db.sideEffects.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const events = useLiveQuery(
    () => db.events.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [substance, setSubstance] = useState('');
  const [dose, setDose] = useState('');
  const [unit, setUnit] = useState('mg');
  const [schedule, setSchedule] = useState<string | undefined>(undefined);
  const [isEmergency, setIsEmergency] = useState(false);
  const [rhythmFor, setRhythmFor] = useState<string | null>(null);

  const [planFor, setPlanFor] = useState<string | null>(null);
  const [stepDate, setStepDate] = useState(localDayKey(new Date().toISOString()));
  const [stepDose, setStepDose] = useState('');
  const [stepNote, setStepNote] = useState('');

  const [effectsFor, setEffectsFor] = useState<string | null>(null);
  const [effectText, setEffectText] = useState('');

  async function add() {
    await db.medications.add({
      id: newId(),
      profileId: profile.id,
      name: name.trim(),
      substance: substance.trim() || undefined,
      dose: Number(dose),
      unit,
      schedule,
      isEmergency,
      startDate: nowIso().slice(0, 10),
      createdAt: nowIso(),
    });
    setName(''); setSubstance(''); setDose(''); setSchedule(undefined); setIsEmergency(false);
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

  async function addSideEffect(medicationId: string) {
    if (!effectText.trim()) return;
    await db.sideEffects.add({
      id: newId(),
      profileId: profile.id,
      medicationId,
      text: effectText.trim(),
      at: nowIso(),
      createdAt: nowIso(),
    });
    setEffectText('');
  }

  async function removeSideEffect(id: string) {
    await db.sideEffects.delete(id);
  }

  if (!medications) return null;
  const effectsOf = (medId: string) =>
    (sideEffects ?? [])
      .filter((s) => s.medicationId === medId)
      .sort((a, b) => b.at.localeCompare(a.at));
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
          const todayKey = localDayKey(new Date().toISOString());
          const taper = taperInfo(m, todayKey);
          return (
            <div key={m.id} className={m.isEmergency ? 'med-card emergency' : 'med-card'}>
              <div className="med-card-head">
                {m.isEmergency ? (
                  <IconEmergency size={20} className="inline-icon" />
                ) : (
                  <IconPill size={20} className="inline-icon" />
                )}
                <span className="med-name">{m.name}</span>
                <span className="med-dose-badge">
                  {steps.length > 0 ? `${current} ${m.unit}` : `${m.dose} ${m.unit}`}
                </span>
              </div>
              <div className="meta">
                {steps.length > 0 ? `Basis ${m.dose} ${m.unit}` : ''}
                {steps.length > 0 && m.substance ? ' · ' : ''}
                {m.substance ?? ''}
                {(steps.length > 0 || m.substance) && m.startDate ? ' · ' : ''}
                {m.startDate ? `seit ${fmtDayKey(m.startDate)}` : ''}
              </div>
              <div className={m.isEmergency ? 'meta' : rhythmWords(m.schedule) ? 'meta rhythm' : 'meta rhythm none'}>
                {m.isEmergency
                  ? 'bei Bedarf / im Notfall'
                  : rhythmWords(m.schedule)
                    ? `⏱ ${rhythmWords(m.schedule)} (${m.schedule})`
                    : '⏱ kein fester Rhythmus — über „Rhythmus" einstellen'}
              </div>
              {taper && (
                <div className="meta taper">
                  {taper.direction === 'down' ? '⤵' : taper.direction === 'up' ? '⤴' : '↔'}{' '}
                  {DIRECTION_LABEL[taper.direction]}
                  {taper.reached
                    ? ` — Ziel ${taper.targetDose} ${m.unit} erreicht (seit ${fmtDayKey(taper.endDate)})`
                    : ` — Stufe ${Math.max(taper.currentIndex + 1, 0)} von ${taper.steps.length}, aktuell ${taper.currentDose} ${m.unit}` +
                      (taper.daysUntilNext != null
                        ? ` · nächste Stufe (${taper.nextDose} ${m.unit}) in ${taper.daysUntilNext} Tag${taper.daysUntilNext === 1 ? '' : 'en'}`
                        : '') +
                      ` · Ziel ${taper.targetDose} ${m.unit} in ${taper.daysUntilEnd} Tag${taper.daysUntilEnd === 1 ? '' : 'en'} (${fmtDayKey(taper.endDate)})`}
                </div>
              )}

              <div className="med-actions">
                {!m.isEmergency && (
                  <button
                    className={rhythmFor === m.id ? 'active' : ''}
                    onClick={() => setRhythmFor(rhythmFor === m.id ? null : m.id)}
                    aria-label={`Einnahme-Rhythmus von ${m.name} einstellen`}
                    aria-expanded={rhythmFor === m.id}
                  >
                    <IconStopwatch size={18} />
                    Rhythmus
                  </button>
                )}
                <button
                  className={planFor === m.id ? 'active' : ''}
                  onClick={() => setPlanFor(planFor === m.id ? null : m.id)}
                  aria-label={`Dosisänderungs-Plan von ${m.name}`}
                  aria-expanded={planFor === m.id}
                >
                  <IconGauge size={18} />
                  Plan
                </button>
                <button
                  className={effectsFor === m.id ? 'active' : ''}
                  onClick={() => setEffectsFor(effectsFor === m.id ? null : m.id)}
                  aria-label={`Beobachtete Auffälligkeiten unter ${m.name}`}
                  aria-expanded={effectsFor === m.id}
                >
                  <IconEmergency size={18} />
                  {effectsOf(m.id).length > 0 ? `Auffällig (${effectsOf(m.id).length})` : 'Auffällig'}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`${m.name} wirklich absetzen? Die Historie bleibt erhalten.`))
                      endMedication(m.id);
                  }}
                  aria-label={`${m.name} absetzen (Historie bleibt erhalten)`}
                >
                  <IconStop size={18} />
                  Absetzen
                </button>
              </div>

              {effectsFor === m.id && (
                <div className="card" style={{ marginTop: 6 }}>
                  <h2>Beobachtete Auffälligkeiten unter {m.name}</h2>
                  <p className="hint" style={{ marginTop: 0 }}>
                    Mögliche Nebenwirkungen dokumentieren — z. B. Gewichtszunahme, Müdigkeit,
                    Verhaltensänderung, undeutlichere Aussprache. Das ist ein dokumentierter
                    Verdacht fürs Arztgespräch, keine Kausalaussage. Erscheint im Arztbericht
                    beim Medikament.
                  </p>
                  {effectsOf(m.id).length === 0 && <p className="empty">Noch nichts notiert.</p>}
                  {effectsOf(m.id).map((s) => (
                    <div key={s.id} className="entry kind-observation">
                      <div className="body">
                        <div className="title" style={{ fontWeight: 400 }}>{s.text}</div>
                        <div className="meta">{fmtDate(s.at)}</div>
                      </div>
                      <button className="btn secondary"
                        style={{ width: 'auto', padding: '6px 10px', marginTop: 0 }}
                        onClick={() => removeSideEffect(s.id)} aria-label="Notiz entfernen">
                        🗑
                      </button>
                    </div>
                  ))}
                  <label className="field" style={{ marginTop: 8 }}>
                    <span>Neue Beobachtung</span>
                    <input type="text" value={effectText}
                      onChange={(e) => setEffectText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSideEffect(m.id)}
                      placeholder="z. B. seit 2 Wochen deutlich mehr Appetit" />
                  </label>
                  <button className="btn" onClick={() => addSideEffect(m.id)}
                    disabled={effectText.trim() === ''}>
                    ＋ Beobachtung notieren
                  </button>
                </div>
              )}

              {rhythmFor === m.id && (
                <div className="card" style={{ marginTop: 6 }}>
                  <h2>Einnahme-Rhythmus</h2>
                  <p className="hint" style={{ marginTop: 0 }}>
                    Wie oft wird {m.name} am Tag genommen? Der Rhythmus steuert den
                    Tagesstatus auf „Heute" („⏰ jetzt fällig" / „✓ heute erledigt").
                  </p>
                  <ScheduleEditor
                    value={m.schedule}
                    onChange={(schedule) => db.medications.update(m.id, { schedule })}
                  />
                </div>
              )}

              {planFor === m.id && (
                <div className="card" style={{ marginTop: 6 }}>
                  <h2>Dosisänderungs-Plan</h2>
                  <p className="hint" style={{ marginTop: 0 }}>
                    Vom Arzt verordnete Stufen dokumentieren — z. B. stufenweises Herabsetzen.
                    Die App übernimmt ab dem jeweiligen Datum automatisch die passende
                    Standarddosis bei der Einnahme-Erfassung. Sie berechnet selbst keine Pläne.
                  </p>
                  {steps.length === 0 && <p className="empty">Noch keine Stufen hinterlegt.</p>}
                  {taperPhases(m, events ?? [], todayKey).map((phase, idx) => {
                    const s = steps[idx];
                    const isCurrent = taper && taper.currentIndex === idx;
                    return (
                      <div key={`${s.fromDate}-${idx}`} className={isCurrent ? 'entry kind-intake phase-current' : 'entry kind-intake'}>
                        <div className="body">
                          <div className="title">
                            ab {fmtDayKey(s.fromDate)}: {s.dose} {m.unit}
                            {isCurrent ? ' — aktuelle Stufe' : ''}
                          </div>
                          {s.note && <div className="meta">{s.note}</div>}
                          <div className="meta">
                            {phase.upcoming
                              ? 'steht noch bevor'
                              : `${phase.eventCount === 0 ? 'kein Ereignis' : `${phase.eventCount} Ereignis${phase.eventCount === 1 ? '' : 'se'}`} in dieser Phase dokumentiert`}
                          </div>
                        </div>
                        <button className="btn secondary"
                          style={{ width: 'auto', padding: '6px 10px', marginTop: 0 }}
                          onClick={() => removeStep(m, idx)} aria-label="Stufe entfernen">
                          🗑
                        </button>
                      </div>
                    );
                  })}
                  {steps.length > 0 && (
                    <p className="hint">
                      Die Ereigniszähler zeigen, was während der einzelnen Phasen dokumentiert
                      wurde — Details im Verlauf (Dosiswechsel sind dort markiert). Die Bewertung
                      gehört ins ärztliche Gespräch.
                    </p>
                  )}
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
          <label className="field"><span>Einnahme-Rhythmus (optional)</span></label>
          <ScheduleEditor value={schedule} onChange={setSchedule} />
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
