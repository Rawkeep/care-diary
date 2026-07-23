// Erster Start: Profil anlegen (für sich selbst oder eine betreute Person).
import { useState } from 'react';
import { db } from '../db/db';
import { newId, nowIso } from '../db/models';
import { useAppStore } from '../store/appStore';

export function ProfileSetup() {
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [epilepsy, setEpilepsy] = useState(true);

  async function create() {
    const id = newId();
    await db.profiles.add({
      id,
      name: name.trim(),
      birthDate: birthDate || undefined,
      conditions: epilepsy ? ['epilepsy'] : [],
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
        <label className="check-row">
          <input type="checkbox" checked={epilepsy} onChange={(e) => setEpilepsy(e.target.checked)} />
          Epilepsie-Modul aktivieren (Anfallstagebuch)
        </label>
        <button className="btn" onClick={create} disabled={name.trim() === ''}>
          Profil anlegen
        </button>
      </div>
    </main>
  );
}
