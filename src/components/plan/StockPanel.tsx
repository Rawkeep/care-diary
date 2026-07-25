// Modul „Medikamenten-Bestand" — zählen, hochrechnen, rechtzeitig nachlegen.
//
// Der gezählte Bestand ist der Anker; verbraucht wird, was als Einnahme
// dokumentiert ist. Deshalb gibt es zwei ehrliche Knöpfe: „neu gezählt"
// (setzt den Anker) und „Packung dazu" (rechnet auf den aktuellen Stand).
// Die App bucht nichts im Hintergrund — sie rechnet nur mit.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { MedStock, Medication, Profile } from '../../db/models';
import { nowIso } from '../../db/models';
import { fmtDayKey, fmtDays, localDayKey } from '../../utils/date';
import {
  addPack,
  newStock,
  projectStock,
  recount,
  stockExpiry,
  type StockState,
} from '../../utils/stock';
import { parseSchedule } from '../../utils/schedule';
import { IconEmergency, IconPill, IconStock, IconTrash } from '../icons';

const STATE_TEXT: Record<StockState, string> = {
  ok: 'reicht',
  low: 'wird knapp',
  critical: 'fast leer',
  empty: 'leer',
  unknown: 'ohne Rhythmus',
};

const num = (v: string) => Number(v.replace(',', '.'));
const fmtNum = (n: number) => String(n).replace('.', ',');

export function StockPanel({ profile }: { profile: Profile }) {
  const medications = useLiveQuery(
    () => db.medications.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const intakes = useLiveQuery(
    () => db.intakes.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const stocks = useLiveQuery(
    () => db.stocks.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );

  const [openFor, setOpenFor] = useState<string | null>(null);
  const [countValue, setCountValue] = useState('');
  const [packValue, setPackValue] = useState('');

  if (!medications || !intakes || !stocks) return null;
  const active = medications.filter((m) => !m.endDate);
  const now = nowIso();
  const today = localDayKey(now);

  const patch = (medicationId: string, changes: Partial<MedStock>) =>
    db.stocks.update(medicationId, { ...changes, updatedAt: nowIso() });

  async function startTracking(med: Medication) {
    await db.stocks.put(newStock(med, profile.id, nowIso()));
    setOpenFor(med.id);
    setCountValue('');
  }

  function card(med: Medication) {
    const stock = stocks!.find((s) => s.medicationId === med.id);
    const editing = openFor === med.id;

    if (!stock) {
      return (
        <div key={med.id} className="med-card">
          <div className="med-card-head">
            {med.isEmergency ? (
              <IconEmergency size={20} className="inline-icon" />
            ) : (
              <IconPill size={20} className="inline-icon" />
            )}
            <span className="med-name">{med.name}</span>
            <span className="med-dose-badge">kein Bestand geführt</span>
          </div>
          <div className="med-actions">
            <button onClick={() => startTracking(med)}>
              <IconStock size={18} />
              Bestand führen
            </button>
          </div>
        </div>
      );
    }

    const p = projectStock(stock, med, intakes!, now);
    const exp = stockExpiry(stock, today);
    const plan = parseSchedule(med.schedule);
    const urgent = p.state === 'empty' || p.state === 'critical' || exp.state === 'expired';

    return (
      <div key={med.id} className={`med-card ${urgent ? 'emergency' : ''}`}>
        <div className="med-card-head">
          {med.isEmergency ? (
            <IconEmergency size={20} className="inline-icon" />
          ) : (
            <IconPill size={20} className="inline-icon" />
          )}
          <span className="med-name">{med.name}</span>
          <span className="med-dose-badge">
            {fmtNum(p.units)} {stock.unitLabel}
          </span>
        </div>
        <div className={p.state === 'ok' ? 'meta rhythm' : 'meta taper'}>
          {p.daysLeft != null
            ? `Reicht noch ${fmtDays(p.daysLeft)} (bis ${fmtDayKey(p.emptyOn!)}) — ${STATE_TEXT[p.state]}`
            : p.state === 'empty'
              ? 'Leer — nach der Doku ist nichts mehr da'
              : 'Reichweite nicht berechenbar: kein Einnahme-Rhythmus hinterlegt (Bedarfsmedikation)'}
        </div>
        <div className="meta">
          {plan
            ? `Verbrauch ${fmtNum(p.perDay)} ${stock.unitLabel}/Tag · `
            : ''}
          Vorlauf {fmtDays(stock.leadDays)} · gezählt am {fmtDayKey(localDayKey(stock.countedAt))}
          {p.consumed > 0 ? ` · seither ${fmtNum(p.consumed)} verbraucht` : ''}
        </div>
        {exp.state !== 'none' && (
          <div className={exp.state === 'ok' ? 'meta' : 'meta taper'}>
            {exp.state === 'expired'
              ? `⛔ Verfallsdatum ${fmtDayKey(stock.expiryDate!)} überschritten`
              : `Verfällt am ${fmtDayKey(stock.expiryDate!)}${exp.daysLeft != null ? ` (in ${fmtDays(exp.daysLeft)})` : ''}`}
          </div>
        )}

        <div className="med-actions">
          <button
            className={editing ? 'active' : ''}
            onClick={() => {
              setOpenFor(editing ? null : med.id);
              setCountValue('');
              setPackValue('');
            }}
            aria-expanded={editing}
          >
            <IconStock size={18} />
            {editing ? 'Fertig' : 'Zählen / Nachlegen'}
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Bestand von ${med.name} nicht mehr führen?`))
                db.stocks.delete(med.id);
            }}
            aria-label={`Bestand von ${med.name} nicht mehr führen`}
          >
            <IconTrash size={18} />
            Nicht mehr führen
          </button>
        </div>

        {editing && (
          <div className="card" style={{ marginTop: 6 }}>
            <h2>Bestand pflegen</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="field" style={{ flex: 1 }}>
                <span>Jetzt gezählt ({stock.unitLabel})</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={countValue}
                  onChange={(e) => setCountValue(e.target.value)}
                  placeholder={fmtNum(p.units)}
                />
              </label>
              <button
                className="btn"
                style={{ width: 'auto', marginTop: 22 }}
                disabled={countValue === '' || !Number.isFinite(num(countValue))}
                onClick={async () => {
                  await db.stocks.put(recount(stock, num(countValue), nowIso()));
                  setCountValue('');
                }}
              >
                Übernehmen
              </button>
            </div>
            <p className="hint" style={{ marginTop: 0 }}>
              Zählen setzt den Startpunkt neu — ab dann zählt die App die dokumentierten
              Einnahmen ab.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="field" style={{ flex: 1 }}>
                <span>Packung dazu ({stock.unitLabel})</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={packValue}
                  onChange={(e) => setPackValue(e.target.value)}
                  placeholder="z. B. 100"
                />
              </label>
              <button
                className="btn secondary"
                style={{ width: 'auto', marginTop: 22 }}
                disabled={packValue === '' || !Number.isFinite(num(packValue)) || num(packValue) <= 0}
                onClick={async () => {
                  await db.stocks.put(addPack(stock, med, intakes!, num(packValue), nowIso()));
                  setPackValue('');
                }}
              >
                ＋ Dazu
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <label className="field" style={{ flex: 1 }}>
                <span>Einheit</span>
                <input
                  type="text"
                  value={stock.unitLabel}
                  onChange={(e) => patch(med.id, { unitLabel: e.target.value })}
                />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Je Einzeldosis</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={stock.unitsPerDose}
                  onChange={(e) =>
                    Number.isFinite(num(e.target.value)) &&
                    patch(med.id, { unitsPerDose: num(e.target.value) })
                  }
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="field" style={{ flex: 1 }}>
                <span>Vorlauf (Tage)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={stock.leadDays}
                  onChange={(e) =>
                    Number.isFinite(Number(e.target.value)) &&
                    patch(med.id, { leadDays: Math.max(0, Math.round(Number(e.target.value))) })
                  }
                />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Verfällt am (optional)</span>
                <input
                  type="date"
                  value={stock.expiryDate ?? ''}
                  onChange={(e) => patch(med.id, { expiryDate: e.target.value || undefined })}
                />
              </label>
            </div>
            <p className="hint">
              „Je Einzeldosis" ist die Menge, die bei einer Einnahme weggeht — z. B. 0,5 bei
              halben Tabletten. Der Vorlauf ist die Zeit, die ihr für Rezept und Apotheke braucht.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Bestand &amp; Nachschub</h2>
      <p className="hint" style={{ marginTop: 0 }}>
        Einmal zählen, Vorlauf einstellen — danach meldet sich die App, wenn der Vorrat mit
        Vorlaufzeit zur Neige geht. Für Notfallmedikation lohnt vor allem das Verfallsdatum.
      </p>
      {active.length === 0 && <p className="empty">Noch keine Medikamente angelegt.</p>}
      {active.map(card)}
    </div>
  );
}
