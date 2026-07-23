// Lebens-Historie: Meilensteine, Diagnosen, Klinikaufenthalte, Arzttermine —
// rückwirkend erfassbar („von Beginn an"), auch mit ungefährem Datum.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Profile, TimelineKind } from '../db/models';
import { newId, nowIso } from '../db/models';
import { fmtDayKey } from '../utils/date';

const KINDS: { value: TimelineKind; label: string; icon: string }[] = [
  { value: 'milestone', label: 'Meilenstein / Entwicklung', icon: '🌱' },
  { value: 'diagnosis', label: 'Diagnose', icon: '🩺' },
  { value: 'hospital', label: 'Krankenhaus / Klinik', icon: '🏥' },
  { value: 'appointment', label: 'Arzttermin', icon: '📅' },
  { value: 'other', label: 'Sonstiges', icon: '📌' },
];

export function TimelineSection({ profile }: { profile: Profile }) {
  const entries = useLiveQuery(
    () => db.timeline.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );

  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<TimelineKind>('milestone');
  const [date, setDate] = useState('');
  const [approximate, setApproximate] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');

  async function add() {
    await db.timeline.add({
      id: newId(),
      profileId: profile.id,
      kind,
      date,
      approximate: approximate || undefined,
      title: title.trim(),
      note: note.trim() || undefined,
      createdAt: nowIso(),
    });
    setTitle('');
    setNote('');
    setApproximate(false);
    setShowForm(false);
  }

  async function remove(id: string) {
    if (confirm('Eintrag wirklich löschen?')) await db.timeline.delete(id);
  }

  if (!entries) return null;
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const iconOf = (k: TimelineKind) => KINDS.find((x) => x.value === k)?.icon ?? '📌';

  return (
    <>
      {showForm ? (
        <div className="card">
          <h2>Historien-Eintrag nachtragen</h2>
          <label className="field">
            <span>Art</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as TimelineKind)}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.icon} {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Datum (bei Altdaten ruhig ungefähr)</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={approximate}
              onChange={(e) => setApproximate(e.target.checked)}
            />
            Datum ist ungefähr
          </label>
          <label className="field">
            <span>Titel *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Erster Anfall, Diagnose, OP, Medikament umgestellt …"
            />
          </label>
          <label className="field">
            <span>Notiz (optional)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button className="btn" onClick={add} disabled={title.trim() === '' || date === ''}>
            Eintrag speichern
          </button>
          <button className="btn secondary" onClick={() => setShowForm(false)}>Abbrechen</button>
        </div>
      ) : (
        <button className="btn" onClick={() => setShowForm(true)}>
          ＋ Eintrag nachtragen (auch rückwirkend)
        </button>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <h2>Lebens-Historie</h2>
        {sorted.length === 0 && !profile.birthDate && (
          <p className="empty">Noch keine Einträge — Diagnosen, Meilensteine und Termine nachtragen.</p>
        )}
        {sorted.map((entry) => (
          <div key={entry.id} className="entry kind-observation">
            <div className="body">
              <div className="title">
                {iconOf(entry.kind)} {entry.title}
              </div>
              <div className="meta">
                {entry.approximate ? 'ca. ' : ''}
                {fmtDayKey(entry.date)}
                {entry.note ? ` · ${entry.note}` : ''}
              </div>
            </div>
            <button
              className="btn secondary"
              style={{ width: 'auto', padding: '6px 10px', marginTop: 0 }}
              onClick={() => remove(entry.id)}
              aria-label="Eintrag löschen"
            >
              🗑
            </button>
          </div>
        ))}
        {profile.birthDate && (
          <div className="entry kind-observation">
            <div className="body">
              <div className="title">👶 Geburt</div>
              <div className="meta">{fmtDayKey(profile.birthDate)}</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
