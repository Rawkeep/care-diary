// Ereignis-Erfassung — im Akutfall vorbefüllt aus dem Timer (Start + Dauer),
// Details werden in Ruhe ergänzt. Nur Typ + Zeitpunkt sind Pflicht.
import { useState } from 'react';
import { db } from '../../db/db';
import type { Profile } from '../../db/models';
import { newId, nowIso } from '../../db/models';
import type { ConditionPreset } from '../../presets/epilepsy';
import { useAppStore } from '../../store/appStore';
import { fromLocalInputValue, toLocalInputValue } from '../../utils/date';

export function EventForm({
  profile,
  preset,
  onDone,
}: {
  profile: Profile;
  preset: ConditionPreset;
  onDone: () => void;
}) {
  const { acuteStartedAt, clearAcute } = useAppStore();
  const acuteDuration = acuteStartedAt
    ? Math.max(1, Math.round((Date.now() - new Date(acuteStartedAt).getTime()) / 1000))
    : null;

  const [type, setType] = useState(preset.eventTypes[0].key);
  const [startedAt, setStartedAt] = useState(
    toLocalInputValue(acuteStartedAt ? new Date(acuteStartedAt) : new Date())
  );
  const [minutes, setMinutes] = useState(acuteDuration ? String(Math.floor(acuteDuration / 60)) : '');
  const [seconds, setSeconds] = useState(acuteDuration ? String(acuteDuration % 60) : '');
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5 | undefined>(undefined);
  const [circumstances, setCircumstances] = useState<string[]>([]);
  const [aura, setAura] = useState(false);
  const [emergencyMed, setEmergencyMed] = useState(false);
  const [postPhase, setPostPhase] = useState('');
  const [note, setNote] = useState('');

  function toggleCircumstance(c: string) {
    setCircumstances((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function save() {
    const totalSeconds = Number(minutes || 0) * 60 + Number(seconds || 0);
    await db.events.add({
      id: newId(),
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
      createdAt: nowIso(),
    });
    clearAcute();
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

      <button className="btn" onClick={save}>Speichern</button>
    </div>
  );
}
