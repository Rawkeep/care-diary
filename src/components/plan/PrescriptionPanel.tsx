// Modul „Verordnungen & Fristen" — den Weg eines Rezepts festhalten:
// gebraucht → angefragt → ausgestellt → eingelöst. Die App rechnet die
// Einlösefrist aus dem Ausstellungsdatum und erinnert; verbindlich bleibt
// der Beleg. Fristangaben sind deshalb überall als Richtwert benannt.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { Prescription, PrescriptionKind, Profile } from '../../db/models';
import { newId, nowIso } from '../../db/models';
import { fmtDayKey, fmtDays, localDayKey } from '../../utils/date';
import {
  PRESCRIPTION_KINDS,
  prescriptionInfo,
  prescriptionKindDef,
  sortPrescriptions,
  validDaysOf,
  type PrescriptionState,
} from '../../utils/prescription';
import { IconPrescription, IconTrash } from '../icons';

const STATE_TEXT: Record<PrescriptionState, string> = {
  needed: 'noch anzufragen',
  requested: 'angefragt',
  waiting: 'angefragt — nachfragen',
  valid: 'einlösbar',
  expiring: 'Frist läuft ab',
  expired: 'Frist abgelaufen',
  redeemed: 'eingelöst',
  issued_unknown: 'da — Ausstellungsdatum fehlt',
};

/** Zustände, die als dringend eingefärbt werden */
const URGENT: PrescriptionState[] = ['expired', 'expiring', 'waiting'];

export function PrescriptionPanel({ profile }: { profile: Profile }) {
  const prescriptions = useLiveQuery(
    () => db.prescriptions.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const medications = useLiveQuery(
    () => db.medications.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<PrescriptionKind>('kasse');
  const [prescriber, setPrescriber] = useState('');
  const [medicationId, setMedicationId] = useState('');
  const [note, setNote] = useState('');
  const [showDone, setShowDone] = useState(false);

  const today = localDayKey(new Date().toISOString());
  const activeMeds = (medications ?? []).filter((m) => !m.endDate);

  async function add() {
    const now = nowIso();
    await db.prescriptions.add({
      id: newId(),
      profileId: profile.id,
      medicationId: medicationId || undefined,
      title: title.trim(),
      kind,
      status: 'needed',
      prescriber: prescriber.trim() || undefined,
      note: note.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
    setTitle('');
    setPrescriber('');
    setMedicationId('');
    setNote('');
    setShowForm(false);
  }

  const patch = (id: string, changes: Partial<Prescription>) =>
    db.prescriptions.update(id, { ...changes, updatedAt: nowIso() });

  /** Nachbestellen: bewusst ein neuer Vorgang, der alte bleibt Historie */
  async function renew(p: Prescription) {
    const now = nowIso();
    await db.prescriptions.add({
      ...p,
      id: newId(),
      status: 'needed',
      requestedDate: undefined,
      issuedDate: undefined,
      redeemedDate: undefined,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (!prescriptions) return null;
  const sorted = sortPrescriptions(prescriptions, today);
  const open = sorted.filter((p) => p.status !== 'redeemed');
  const done = sorted.filter((p) => p.status === 'redeemed');
  const medName = (id?: string) => medications?.find((m) => m.id === id)?.name;

  function card(p: Prescription) {
    const info = prescriptionInfo(p, today);
    const kindDef = prescriptionKindDef(p.kind);
    return (
      <div key={p.id} className={`med-card ${URGENT.includes(info.state) ? 'emergency' : ''}`}>
        <div className="med-card-head">
          <IconPrescription size={20} className="inline-icon" />
          <span className="med-name">{p.title}</span>
          <span className="med-dose-badge">{STATE_TEXT[info.state]}</span>
        </div>
        <div className="meta">
          {kindDef.label}
          {p.prescriber ? ` · ${p.prescriber}` : ''}
          {medName(p.medicationId) ? ` · für ${medName(p.medicationId)}` : ''}
        </div>
        {info.state === 'needed' && info.openDays != null && info.openDays > 0 && (
          <div className="meta">Auf der Liste seit {fmtDays(info.openDays)}.</div>
        )}
        {p.requestedDate && (
          <div className="meta">
            Angefragt am {fmtDayKey(p.requestedDate)}
            {info.waitingDays != null && info.waitingDays > 0 ? ` (vor ${fmtDays(info.waitingDays)})` : ''}
          </div>
        )}
        {p.issuedDate && (
          <div className="meta rhythm">
            Ausgestellt am {fmtDayKey(p.issuedDate)} · Frist {fmtDays(validDaysOf(p))} (Richtwert)
            {info.expiry ? ` → bis ${fmtDayKey(info.expiry)}` : ''}
            {info.daysLeft != null &&
              (info.daysLeft >= 0
                ? ` · noch ${fmtDays(info.daysLeft)}`
                : ` · seit ${fmtDays(-info.daysLeft)} abgelaufen`)}
          </div>
        )}
        {p.redeemedDate && <div className="meta">Eingelöst am {fmtDayKey(p.redeemedDate)}</div>}
        {p.note && <div className="meta">{p.note}</div>}
        {info.state === 'issued_unknown' && (
          <label className="field" style={{ marginTop: 6 }}>
            <span>Ausstellungsdatum nachtragen (startet die Frist)</span>
            <input
              type="date"
              value=""
              onChange={(e) => e.target.value && patch(p.id, { issuedDate: e.target.value })}
            />
          </label>
        )}

        <div className="med-actions">
          {p.status === 'needed' && (
            <button onClick={() => patch(p.id, { status: 'requested', requestedDate: today })}>
              ✓ Angefragt
            </button>
          )}
          {p.status === 'requested' && (
            <button onClick={() => patch(p.id, { status: 'issued', issuedDate: today })}>
              ✓ Rezept ist da
            </button>
          )}
          {p.status === 'issued' && (
            <button onClick={() => patch(p.id, { status: 'redeemed', redeemedDate: today })}>
              ✓ In der Apotheke eingelöst
            </button>
          )}
          {p.status === 'redeemed' && <button onClick={() => renew(p)}>↻ Brauchen wir wieder</button>}
          <button
            onClick={() => {
              if (window.confirm(`„${p.title}" wirklich aus der Liste löschen?`))
                db.prescriptions.delete(p.id);
            }}
            aria-label={`${p.title} löschen`}
          >
            <IconTrash size={18} />
            Löschen
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h2>Offene Verordnungen</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Vom „brauchen wir" bis zum Einlösen. Die Fristen sind die üblichen Richtwerte der
          Rezeptart — maßgeblich ist das, was auf dem Beleg steht; eine abweichende Frist lässt
          sich beim Anlegen eintragen.
        </p>
        {open.length === 0 && <p className="empty">Nichts offen — alles besorgt.</p>}
        {open.map(card)}
      </div>

      {showForm ? (
        <div className="card">
          <h2>Verordnung notieren</h2>
          <label className="field">
            <span>Was wird gebraucht? *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Levetiracetam 500 mg, N3"
            />
          </label>
          <label className="field">
            <span>Art der Verordnung</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as PrescriptionKind)}>
              {PRESCRIPTION_KINDS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label} — {k.validDays} Tage
                </option>
              ))}
            </select>
          </label>
          <p className="hint" style={{ marginTop: 0 }}>
            {prescriptionKindDef(kind).hint}
          </p>
          <label className="field">
            <span>Praxis / Ärzt:in (optional)</span>
            <input
              type="text"
              value={prescriber}
              onChange={(e) => setPrescriber(e.target.value)}
              placeholder="z. B. Dr. Weber"
            />
          </label>
          {activeMeds.length > 0 && (
            <label className="field">
              <span>Gehört zu welchem Medikament? (optional — verbindet sich mit dem Bestand)</span>
              <select value={medicationId} onChange={(e) => setMedicationId(e.target.value)}>
                <option value="">— keine Zuordnung —</option>
                {activeMeds.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span>Notiz (optional)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="z. B. bitte als Dauerverordnung"
            />
          </label>
          <button className="btn" onClick={add} disabled={title.trim() === ''}>
            Verordnung anlegen
          </button>
          <button className="btn secondary" onClick={() => setShowForm(false)}>
            Abbrechen
          </button>
        </div>
      ) : (
        <button className="btn" onClick={() => setShowForm(true)}>
          ＋ Verordnung brauchen wir
        </button>
      )}

      {done.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <h2>Eingelöst (Historie)</h2>
          <button className="btn secondary" onClick={() => setShowDone(!showDone)}>
            {showDone ? 'Historie einklappen' : `${done.length} eingelöste anzeigen`}
          </button>
          {showDone && done.map(card)}
        </div>
      )}
    </>
  );
}
