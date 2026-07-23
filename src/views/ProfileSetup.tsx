// Erster Start: Profil anlegen (für sich selbst oder eine betreute Person)
// und passendes Erkrankungs-Modul wählen.
import { useState } from 'react';
import { db } from '../db/db';
import { newId, nowIso } from '../db/models';
import { GENERIC_PRESET, SELECTABLE_PRESETS } from '../presets/epilepsy';
import { useAppStore } from '../store/appStore';

const MODULE_DESC: Record<string, string> = {
  epilepsy: 'Anfallstagebuch mit Anfallsarten, Aura, Nachphase und Notfallmedikation.',
  migraine: 'Kopfschmerz-Tagebuch mit Migräne-Arten, Triggern und Schmerz-Skala.',
  generic: 'Neutrales Tagebuch für Episoden, Auffälligkeiten und Allgemeinzustand.',
};

export function ProfileSetup() {
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [condition, setCondition] = useState('epilepsy');

  async function create() {
    const id = newId();
    await db.profiles.add({
      id,
      name: name.trim(),
      birthDate: birthDate || undefined,
      conditions: condition === GENERIC_PRESET.key ? [] : [condition],
      createdAt: nowIso(),
    });
    setActiveProfile(id);
  }

  return (
    <main style={{ paddingTop: 32 }}>
      <div className="card">
        <h2>Willkommen bei care-diary</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Private Gesundheitsverlaufs-Dokumentation. Alle Daten bleiben ausschließlich auf diesem
          Gerät — kein Konto, keine Cloud. Die App dokumentiert, der Arzt entscheidet.
        </p>
        <label className="field">
          <span>Für wen wird dokumentiert? (Name)</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Mia, oder dein eigener Name" />
        </label>
        <label className="field">
          <span>Geburtsdatum (optional — für die Historie „von Beginn an")</span>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </label>

        <label className="field"><span>Erkrankungs-Modul</span></label>
        <div className="choice-list">
          {SELECTABLE_PRESETS.map((p) => (
            <div
              key={p.key}
              className={`choice ${condition === p.key ? 'selected' : ''}`}
              onClick={() => setCondition(p.key)}
              role="radio"
              aria-checked={condition === p.key}
            >
              <div className="label">{p.label}</div>
              <div className="desc">{MODULE_DESC[p.key]}</div>
            </div>
          ))}
        </div>

        <button className="btn" onClick={create} disabled={name.trim() === ''}>
          Profil anlegen
        </button>
      </div>
    </main>
  );
}
