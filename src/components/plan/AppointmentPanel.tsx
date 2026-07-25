// Modul „Termine & Untersuchungen" — EEG, Blutbild, Medikamentenspiegel,
// Kontrolltermine. Zwei Dinge, die im Alltag untergehen, übernimmt die App:
//   • die **Vorbereitung** (Checkliste je Untersuchungsart),
//   • das **Intervall** („alle 3 Monate") — nach dem Abschließen entsteht
//     automatisch der nächste offene Punkt, die Historie bleibt stehen.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { Appointment, AppointmentKind, Profile } from '../../db/models';
import { newId, nowIso } from '../../db/models';
import {
  APPOINTMENT_KINDS,
  DEFAULT_REMINDER_DAYS,
  appointmentInfo,
  appointmentKindDef,
  appointmentTitle,
  completeAppointmentPatch,
  followUpAppointment,
  sortAppointments,
  type AppointmentState,
} from '../../utils/appointments';
import {
  fmtDayKey,
  fmtDays,
  fmtTime,
  localDayKey,
  toLocalInputValue,
  fromLocalInputValue,
} from '../../utils/date';
import { IconClock, IconDone, IconPlan, IconTrash } from '../icons';

const STATE_TEXT: Record<AppointmentState, string> = {
  today: 'heute',
  soon: 'steht an',
  planned: 'geplant',
  past: 'nachtragen',
  due: 'fällig',
  overdue: 'überfällig',
  dueSoon: 'bald fällig',
  open: 'notiert',
  done: 'erledigt',
};

const URGENT: AppointmentState[] = ['today', 'past', 'due', 'overdue'];

export function AppointmentPanel({ profile }: { profile: Profile }) {
  const appointments = useLiveQuery(
    () => db.appointments.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );

  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<AppointmentKind>('checkup');
  const [title, setTitle] = useState('');
  const [at, setAt] = useState('');
  const [place, setPlace] = useState('');
  const [intervalMonths, setIntervalMonths] = useState('');
  const [lastDoneDate, setLastDoneDate] = useState('');
  const [prep, setPrep] = useState<string[]>(appointmentKindDef('checkup').prep);
  const [showDone, setShowDone] = useState(false);
  const [doneFor, setDoneFor] = useState<string | null>(null);
  const [resultNote, setResultNote] = useState('');
  const [planFor, setPlanFor] = useState<string | null>(null);

  const today = localDayKey(new Date().toISOString());

  /** Art wechseln: Vorbereitung und Intervall-Vorschlag mitziehen */
  function chooseKind(next: AppointmentKind) {
    setKind(next);
    const def = appointmentKindDef(next);
    setPrep(def.prep);
    setIntervalMonths(def.suggestedIntervalMonths > 0 ? String(def.suggestedIntervalMonths) : '');
  }

  async function add() {
    const now = nowIso();
    const months = Number(intervalMonths);
    await db.appointments.add({
      id: newId(),
      profileId: profile.id,
      kind,
      title: title.trim() || undefined,
      at: at ? fromLocalInputValue(at) : undefined,
      place: place.trim() || undefined,
      intervalMonths: Number.isFinite(months) && months > 0 ? Math.round(months) : undefined,
      lastDoneDate: lastDoneDate || undefined,
      prep: prep.length > 0 ? prep : undefined,
      createdAt: now,
      updatedAt: now,
    });
    setTitle('');
    setAt('');
    setPlace('');
    setLastDoneDate('');
    setShowForm(false);
  }

  const patch = (id: string, changes: Partial<Appointment>) =>
    db.appointments.update(id, { ...changes, updatedAt: nowIso() });

  /** Abschließen: erledigt markieren und — bei Intervall — den nächsten anlegen */
  async function complete(a: Appointment) {
    const doneDate = a.at ? localDayKey(a.at) : today;
    const now = nowIso();
    await db.appointments.update(a.id, completeAppointmentPatch(doneDate, now, resultNote));
    const next = followUpAppointment(a, doneDate, newId(), now);
    if (next) await db.appointments.add(next);
    setDoneFor(null);
    setResultNote('');
  }

  function togglePrepDone(a: Appointment, item: string) {
    const done = new Set(a.prepDone ?? []);
    if (done.has(item)) done.delete(item);
    else done.add(item);
    patch(a.id, { prepDone: [...done] });
  }

  if (!appointments) return null;
  const sorted = sortAppointments(appointments, today);
  const open = sorted.filter((a) => !a.doneDate);
  const done = sorted.filter((a) => a.doneDate);

  function card(a: Appointment) {
    const info = appointmentInfo(a, today);
    const isDone = Boolean(a.doneDate);
    return (
      <div
        key={a.id}
        className={`med-card ${URGENT.includes(info.state) ? 'emergency' : ''} ${isDone ? 'med-ended' : ''}`}
      >
        <div className="med-card-head">
          <IconPlan size={20} className="inline-icon" />
          <span className="med-name">{appointmentTitle(a)}</span>
          <span className="med-dose-badge">{STATE_TEXT[info.state]}</span>
        </div>
        {a.at && (
          <div className="meta rhythm">
            {fmtDayKey(localDayKey(a.at))} um {fmtTime(a.at)}
            {info.daysUntil != null && !isDone
              ? info.daysUntil === 0
                ? ' — heute'
                : info.daysUntil > 0
                  ? ` — in ${fmtDays(info.daysUntil)}`
                  : ` — vor ${fmtDays(-info.daysUntil)}`
              : ''}
            {a.place ? ` · ${a.place}` : ''}
          </div>
        )}
        {!a.at && a.place && <div className="meta">{a.place}</div>}
        {a.intervalMonths != null && (
          <div className="meta">
            Intervall alle {a.intervalMonths} Monate
            {a.lastDoneDate ? ` · zuletzt ${fmtDayKey(a.lastDoneDate)}` : ' · noch keine Durchführung erfasst'}
            {info.dueDayKey && !isDone ? ` · nächste Fälligkeit ${fmtDayKey(info.dueDayKey)}` : ''}
          </div>
        )}
        {a.doneDate && <div className="meta">Erledigt am {fmtDayKey(a.doneDate)}</div>}
        {a.resultNote && <div className="meta">Ergebnis: {a.resultNote}</div>}
        {a.note && <div className="meta">{a.note}</div>}

        {(a.prep ?? []).length > 0 && !isDone && (
          <div style={{ marginTop: 6 }}>
            <div className="meta">Vorbereitung:</div>
            {(a.prep ?? []).map((item) => (
              <label key={item} className="check-row">
                <input
                  type="checkbox"
                  checked={(a.prepDone ?? []).includes(item)}
                  onChange={() => togglePrepDone(a, item)}
                />
                {item}
              </label>
            ))}
          </div>
        )}

        {!isDone && (
          <div className="med-actions">
            <button
              className={planFor === a.id ? 'active' : ''}
              onClick={() => setPlanFor(planFor === a.id ? null : a.id)}
              aria-expanded={planFor === a.id}
            >
              <IconClock size={18} />
              {a.at ? 'Termin ändern' : 'Termin eintragen'}
            </button>
            <button
              className={doneFor === a.id ? 'active' : ''}
              onClick={() => {
                setDoneFor(doneFor === a.id ? null : a.id);
                setResultNote('');
              }}
              aria-expanded={doneFor === a.id}
            >
              <IconDone size={18} />
              Erledigt
            </button>
            <button
              onClick={() => {
                if (window.confirm(`„${appointmentTitle(a)}" wirklich löschen?`))
                  db.appointments.delete(a.id);
              }}
              aria-label={`${appointmentTitle(a)} löschen`}
            >
              <IconTrash size={18} />
              Löschen
            </button>
          </div>
        )}

        {planFor === a.id && (
          <div className="card" style={{ marginTop: 6 }}>
            <label className="field">
              <span>Termin (Datum &amp; Uhrzeit)</span>
              <input
                type="datetime-local"
                value={a.at ? toLocalInputValue(new Date(a.at)) : ''}
                onChange={(e) =>
                  patch(a.id, { at: e.target.value ? fromLocalInputValue(e.target.value) : undefined })
                }
              />
            </label>
            <label className="field">
              <span>Erinnerung: Tage vorher</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={a.reminderDaysBefore ?? DEFAULT_REMINDER_DAYS}
                onChange={(e) =>
                  Number.isFinite(Number(e.target.value)) &&
                  patch(a.id, {
                    reminderDaysBefore: Math.max(0, Math.round(Number(e.target.value))),
                  })
                }
              />
            </label>
            <label className="field">
              <span>Ort / Praxis</span>
              <input
                type="text"
                value={a.place ?? ''}
                onChange={(e) => patch(a.id, { place: e.target.value || undefined })}
                placeholder="z. B. Uniklinik, Ambulanz 2"
              />
            </label>
            <button className="btn secondary" onClick={() => setPlanFor(null)}>
              Fertig
            </button>
          </div>
        )}

        {doneFor === a.id && (
          <div className="card" style={{ marginTop: 6 }}>
            <h2>Termin abschließen</h2>
            <label className="field">
              <span>Ergebnis in einem Satz (optional — erscheint im Arztbericht)</span>
              <input
                type="text"
                value={resultNote}
                onChange={(e) => setResultNote(e.target.value)}
                placeholder="z. B. EEG unauffällig lt. Dr. Weber"
              />
            </label>
            {a.intervalMonths != null && a.intervalMonths > 0 && (
              <p className="hint" style={{ marginTop: 0 }}>
                Die nächste Kontrolle (in {a.intervalMonths} Monaten) wird automatisch als offener
                Punkt angelegt.
              </p>
            )}
            <button className="btn" onClick={() => complete(a)}>
              ✓ Als erledigt eintragen
            </button>
            <button className="btn secondary" onClick={() => setDoneFor(null)}>
              Abbrechen
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h2>Termine &amp; Kontrollen</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Ein Termin kann fest vereinbart sein („EEG am 12.08.") oder nur als Intervall geführt
          werden („Blutbild alle 3 Monate") — dann erinnert die App, wenn es wieder Zeit ist.
          Vorbereitungen und Intervalle kommen aus der Praxis; die App führt nur die Liste.
        </p>
        {open.length === 0 && <p className="empty">Nichts offen.</p>}
        {open.map(card)}
      </div>

      {showForm ? (
        <div className="card">
          <h2>Termin oder Kontrolle anlegen</h2>
          <label className="field">
            <span>Art *</span>
            <select value={kind} onChange={(e) => chooseKind(e.target.value as AppointmentKind)}>
              {APPOINTMENT_KINDS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Zusatz (optional)</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Dr. Weber, Kontrolle nach Reduktion"
            />
          </label>
          <label className="field">
            <span>Termin (optional — leer lassen, wenn nur das Intervall zählt)</span>
            <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
          </label>
          <label className="field">
            <span>Ort / Praxis (optional)</span>
            <input type="text" value={place} onChange={(e) => setPlace(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <label className="field" style={{ flex: 1 }}>
              <span>Intervall (Monate)</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={intervalMonths}
                onChange={(e) => setIntervalMonths(e.target.value)}
                placeholder="z. B. 3"
              />
            </label>
            <label className="field" style={{ flex: 1 }}>
              <span>Zuletzt durchgeführt</span>
              <input
                type="date"
                value={lastDoneDate}
                onChange={(e) => setLastDoneDate(e.target.value)}
              />
            </label>
          </div>
          {appointmentKindDef(kind).prep.length > 0 && (
            <>
              <label className="field" style={{ marginBottom: 4 }}>
                <span>Vorbereitung (Vorschläge — abwählbar und später ergänzbar)</span>
              </label>
              {appointmentKindDef(kind).prep.map((item) => (
                <label key={item} className="check-row">
                  <input
                    type="checkbox"
                    checked={prep.includes(item)}
                    onChange={(e) =>
                      setPrep(e.target.checked ? [...prep, item] : prep.filter((p) => p !== item))
                    }
                  />
                  {item}
                </label>
              ))}
            </>
          )}
          <button className="btn" onClick={add}>
            Anlegen
          </button>
          <button className="btn secondary" onClick={() => setShowForm(false)}>
            Abbrechen
          </button>
        </div>
      ) : (
        <button className="btn" onClick={() => setShowForm(true)}>
          ＋ Termin / Kontrolle
        </button>
      )}

      {done.length > 0 && (
        <div className="card" style={{ marginTop: 12 }}>
          <h2>Erledigt (Historie)</h2>
          <button className="btn secondary" onClick={() => setShowDone(!showDone)}>
            {showDone ? 'Historie einklappen' : `${done.length} erledigte anzeigen`}
          </button>
          {showDone && done.map(card)}
        </div>
      )}
    </>
  );
}
