// Mehrprofil: Wechsler + Neuanlage (z. B. zwei betreute Kinder in einer App).
// Alle Daten sind strikt per profileId getrennt; Export/Backup enthält alle
// Profile. Löschen gibt es bewusst nicht — Doku ist wertvoll.
import { useState } from 'react';
import { db } from '../db/db';
import type { Profile } from '../db/models';
import { newId, nowIso } from '../db/models';
import { createDemoProfile } from '../demo/demoData';
import { GENERIC_PRESET, presetFor, SELECTABLE_PRESETS } from '../presets/epilepsy';
import { useAppStore } from '../store/appStore';
import { Modal } from './Modal';

export function ProfileSwitcher({
  profiles,
  active,
  onClose,
}: {
  profiles: Profile[];
  active: Profile;
  onClose: () => void;
}) {
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [condition, setCondition] = useState('epilepsy');

  function switchTo(id: string) {
    setActiveProfile(id);
    onClose();
  }

  async function create() {
    const id = newId();
    await db.profiles.add({
      id,
      name: name.trim(),
      birthDate: birthDate || undefined,
      conditions: condition === GENERIC_PRESET.key ? [] : [condition],
      createdAt: nowIso(),
    });
    switchTo(id);
  }

  return (
    <Modal title="Profil wechseln" onClose={onClose}>
      <div className="choice-list">
        {profiles.map((p) => (
          <div
            key={p.id}
            className={`choice ${p.id === active.id ? 'selected' : ''}`}
            onClick={() => switchTo(p.id)}
            role="radio"
            aria-checked={p.id === active.id}
          >
            <div className="label">👤 {p.name}</div>
            <div className="desc">
              {presetFor(p.conditions).label}
              {p.birthDate ? ` · geboren ${p.birthDate}` : ''}
            </div>
          </div>
        ))}
      </div>

      {adding ? (
        <>
          <label className="field">
            <span>Name der neuen Person</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Ben" autoFocus />
          </label>
          <label className="field">
            <span>Geburtsdatum (optional)</span>
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
              </div>
            ))}
          </div>
          <button className="btn" onClick={create} disabled={name.trim() === ''}>
            Profil anlegen &amp; wechseln
          </button>
          <button className="btn secondary" onClick={() => setAdding(false)}>Abbrechen</button>
        </>
      ) : (
        <>
          <button className="btn secondary" onClick={() => setAdding(true)}>
            ＋ Weiteres Profil anlegen
          </button>
          {!profiles.some((p) => p.isDemo) && (
            <button
              className="btn secondary"
              onClick={async () => switchTo(await createDemoProfile())}
            >
              🧪 Demo-Profil laden (Beispieldaten)
            </button>
          )}
        </>
      )}
    </Modal>
  );
}
