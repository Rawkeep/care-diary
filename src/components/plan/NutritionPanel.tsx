// Modul „Ernährung: Gutes & Meiden" — die Gos and No-Gos, die im Alltag
// zwischen Küche, Schule und Großeltern verloren gehen.
//
// Die App empfiehlt hier **nichts**. Sie hält fest, was vereinbart oder
// beobachtet wurde, und macht mit einem Häkchen sichtbar, was ärztlich
// bestätigt ist. Die Vorschläge sind als Frage formuliert — Gesprächsanstöße
// für den nächsten Termin, keine Anweisung.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { NutritionRule, NutritionStance, Profile } from '../../db/models';
import { newId, nowIso } from '../../db/models';
import { groupByStance, STANCES, stanceDef, unusedSuggestions } from '../../utils/nutrition';
import { IconTrash } from '../icons';

export function NutritionPanel({ profile }: { profile: Profile }) {
  const rules = useLiveQuery(
    () => db.nutrition.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );

  const [stance, setStance] = useState<NutritionStance>('avoid');
  const [item, setItem] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  async function add(values?: { stance: NutritionStance; item: string; reason?: string }) {
    const v = values ?? { stance, item: item.trim(), reason: reason.trim() || undefined };
    if (!v.item) return;
    const now = nowIso();
    await db.nutrition.add({
      id: newId(),
      profileId: profile.id,
      stance: v.stance,
      item: v.item,
      reason: v.reason,
      confirmed: values ? false : confirmed,
      createdAt: now,
      updatedAt: now,
    });
    if (!values) {
      setItem('');
      setReason('');
      setConfirmed(false);
    }
  }

  if (!rules) return null;
  const grouped = groupByStance(rules);
  const suggestions = unusedSuggestions(rules);

  function row(r: NutritionRule) {
    return (
      <div key={r.id} className="entry kind-observation">
        <div className="body">
          <div className="title">
            {stanceDef(r.stance).icon} {r.item}
            {r.confirmed ? ' · ärztlich bestätigt' : ''}
          </div>
          {r.reason && <div className="meta">{r.reason}</div>}
        </div>
        <button
          className="btn secondary"
          style={{ width: 'auto', padding: '6px 10px', marginTop: 0 }}
          onClick={() =>
            db.nutrition.update(r.id, { confirmed: !r.confirmed, updatedAt: nowIso() })
          }
          aria-label={
            r.confirmed
              ? `Bestätigung bei ${r.item} zurücknehmen`
              : `${r.item} als ärztlich bestätigt markieren`
          }
        >
          {r.confirmed ? '✓' : '○'}
        </button>
        <button
          className="btn secondary"
          style={{ width: 'auto', padding: '6px 10px', marginTop: 0 }}
          onClick={() => db.nutrition.delete(r.id)}
          aria-label={`${r.item} entfernen`}
        >
          <IconTrash size={16} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h2>Ernährung: Gutes &amp; Meiden</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Die App gibt keine Ernährungsempfehlung — hier steht, was <em>ihr</em> mit der Praxis
          vereinbart oder selbst beobachtet habt. Das Häkchen markiert, was ärztlich bestätigt
          wurde. Die Liste erscheint im Arztbericht und lässt sich im Umfeld-Bericht mitgeben.
        </p>
        {rules.length === 0 && <p className="empty">Noch nichts notiert.</p>}
        {STANCES.map((s) =>
          grouped[s.key].length > 0 ? (
            <div key={s.key} style={{ marginBottom: 10 }}>
              <div className="meta rhythm">
                {s.icon} {s.label}
              </div>
              {grouped[s.key].map(row)}
            </div>
          ) : null
        )}
      </div>

      <div className="card">
        <h2>Eintrag hinzufügen</h2>
        <div className="tabs">
          {STANCES.map((s) => (
            <button
              key={s.key}
              className={stance === s.key ? 'active' : ''}
              onClick={() => setStance(s.key)}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Lebensmittel / Thema *</span>
          <input
            type="text"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="z. B. Grapefruit, Frühstück vor der Tablette"
          />
        </label>
        <label className="field">
          <span>Warum / wer hat es gesagt (optional)</span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="z. B. lt. Dr. Weber wegen Wirkstoffspiegel"
          />
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Ärztlich bestätigt
        </label>
        <button className="btn" onClick={() => add()} disabled={item.trim() === ''}>
          ＋ Hinzufügen
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="card">
          <h2>Fragen für den nächsten Termin</h2>
          <p className="hint" style={{ marginTop: 0 }}>
            Typische Punkte, die man einmal geklärt haben sollte. Ein Tipp übernimmt sie als
            offenen Eintrag — Text und Haltung sind danach frei änderbar.
          </p>
          <div className="med-chips">
            {suggestions.map((s) => (
              <button
                key={s.item}
                className="med-chip"
                onClick={() => add(s)}
                aria-label={`${s.item} übernehmen`}
              >
                {stanceDef(s.stance).icon} {s.item} ＋
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
