// Arzt-Report: druckbare Zusammenfassung eines Zeitraums („der eigentliche
// Payoff"). Browser-Druckdialog → PDF, komplett lokal. Reine Darstellung
// dokumentierter Beobachtungen — keine Interpretation, keine Bewertung.
import { useLiveQuery } from 'dexie-react-hooks';
import { SeizureCalendar } from '../components/SeizureCalendar';
import { StateTrends } from '../components/StateTrends';
import { db } from '../db/db';
import type { IntakeStatus, Profile } from '../db/models';
import type { ConditionPreset } from '../presets/epilepsy';
import { eventTypeLabel } from '../presets/epilepsy';
import { useAppStore } from '../store/appStore';
import {
  countEventsByType,
  eventCountByDay,
  inDayRange,
  intakeStatusByMedication,
  monthsBetween,
  observationStats,
  totalEventDurationSeconds,
} from '../utils/aggregate';
import { effectiveDose } from '../utils/dose';
import { fmtDate, fmtDayKey, fmtDuration, fmtTime, localDayKey } from '../utils/date';

const STATUS_LABEL: Record<IntakeStatus, string> = {
  taken: 'genommen',
  missed: 'ausgelassen',
  late: 'verspätet',
  vomited: 'erbrochen',
};

export function Report({ profile, preset }: { profile: Profile; preset: ConditionPreset }) {
  const { reportRange, closeReport } = useAppStore();
  const intakes = useLiveQuery(() => db.intakes.where('profileId').equals(profile.id).toArray(), [profile.id]);
  const events = useLiveQuery(() => db.events.where('profileId').equals(profile.id).toArray(), [profile.id]);
  const observations = useLiveQuery(
    () => db.observations.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const medications = useLiveQuery(
    () => db.medications.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const questions = useLiveQuery(
    () => db.questions.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );

  if (!reportRange || !intakes || !events || !observations || !medications || !questions) return null;
  const { from, to } = reportRange;

  const evts = inDayRange(events, (e) => e.startedAt, from, to).sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt)
  );
  const intakesR = inDayRange(intakes, (i) => i.at, from, to);
  const obsR = inDayRange(observations, (o) => o.at, from, to);

  const typeCounts = [...countEventsByType(evts).entries()].sort((a, b) => b[1] - a[1]);
  const totalDuration = totalEventDurationSeconds(evts);
  const byDay = eventCountByDay(evts);
  const statusByMed = intakeStatusByMedication(intakesR);
  const stats = [...observationStats(obsR).entries()];

  // Kalender auf dokumentierte Daten begrenzen (max. 12 Monate anzeigen)
  const dataDays = [
    ...evts.map((e) => localDayKey(e.startedAt)),
    ...intakesR.map((i) => localDayKey(i.at)),
    ...obsR.map((o) => localDayKey(o.at)),
  ].sort();
  const calFrom = dataDays.length > 0 ? (dataDays[0] > from ? dataDays[0] : from) : to;
  const months = monthsBetween(calFrom, to);
  const shownMonths = months.slice(-12);

  const remarks = [
    ...evts
      .filter((e) => e.note)
      .map((e) => ({ at: e.startedAt, text: `${eventTypeLabel(preset, e.type)}: ${e.note}` })),
    ...intakesR.filter((i) => i.note).map((i) => ({ at: i.at, text: `Einnahme: ${i.note}` })),
    ...obsR.filter((o) => o.note).map((o) => ({ at: o.at, text: `Zustand: ${o.note}` })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const openQuestions = questions.filter((q) => !q.resolvedAt);
  const paramLabel = (key: string) =>
    preset.observationParams.find((p) => p.key === key)?.label ?? key;
  const medsSorted = [...medications].sort(
    (a, b) => Number(Boolean(a.endDate)) - Number(Boolean(b.endDate))
  );

  return (
    <div className="report">
      <div className="report-actions no-print">
        <button className="btn secondary" onClick={closeReport}>← Zurück</button>
        <button className="btn" onClick={() => window.print()}>🖨 Drucken / als PDF sichern</button>
      </div>

      <h1>Verlaufsbericht — {profile.name}</h1>
      <p className="hint">
        {profile.birthDate ? `Geboren ${fmtDayKey(profile.birthDate)} · ` : ''}
        Zeitraum {fmtDayKey(from)} – {fmtDayKey(to)} · erstellt am{' '}
        {fmtDayKey(localDayKey(new Date().toISOString()))}
      </p>
      <p className="hint">
        Von Patient:in/Angehörigen dokumentierte Beobachtungen (care-diary). Keine ärztliche
        Aufzeichnung, keine Diagnose — Grundlage für das ärztliche Gespräch.
      </p>

      <div className="card">
        <h2>Ereignisse im Zeitraum</h2>
        {typeCounts.length === 0 ? (
          <p className="hint">Keine Ereignisse dokumentiert.</p>
        ) : (
          <table>
            <thead>
              <tr><th>Art</th><th>Anzahl</th></tr>
            </thead>
            <tbody>
              {typeCounts.map(([type, count]) => (
                <tr key={type}>
                  <td>{eventTypeLabel(preset, type)}</td>
                  <td>{count}×</td>
                </tr>
              ))}
              <tr>
                <td><strong>Gesamt</strong></td>
                <td><strong>{evts.length}×</strong></td>
              </tr>
            </tbody>
          </table>
        )}
        {totalDuration > 0 && (
          <p className="hint">Summierte erfasste Dauer: {fmtDuration(totalDuration)}</p>
        )}
      </div>

      {evts.length > 0 && (
        <div className="card">
          <h2>Ereignis-Kalender</h2>
          {months.length > shownMonths.length && (
            <p className="hint">Anzeige auf die letzten 12 Monate begrenzt.</p>
          )}
          {shownMonths.map((m) => (
            <SeizureCalendar key={`${m.year}-${m.month}`} year={m.year} month={m.month} counts={byDay} />
          ))}
        </div>
      )}

      <div className="card">
        <h2>Medikation</h2>
        {medsSorted.length === 0 && <p className="hint">Keine Medikamente dokumentiert.</p>}
        {medsSorted.map((m) => {
          const status = statusByMed.get(m.id);
          const steps = m.doseSteps ?? [];
          return (
            <div key={m.id} style={{ marginBottom: 10 }}>
              <strong>{m.name}</strong>
              {m.endDate ? ' (abgesetzt)' : ''} — Basisdosis {m.dose} {m.unit}
              {m.schedule ? `, Schema ${m.schedule}` : ''}
              {m.startDate ? ` · seit ${fmtDayKey(m.startDate)}` : ''}
              {m.endDate ? ` · bis ${fmtDayKey(m.endDate)}` : ''}
              {steps.length > 0 && (
                <div className="hint">
                  Dosisänderungs-Plan (lt. ärztlicher Verordnung):{' '}
                  {steps
                    .map(
                      (s) =>
                        `ab ${fmtDayKey(s.fromDate)}: ${s.dose} ${m.unit}${s.note ? ` (${s.note})` : ''}`
                    )
                    .join(' · ')}
                  {' — aktuell: '}
                  {effectiveDose(m, new Date().toISOString())} {m.unit}
                </div>
              )}
              {status && (
                <div className="hint">
                  Einnahmen im Zeitraum:{' '}
                  {(Object.keys(STATUS_LABEL) as IntakeStatus[])
                    .filter((s) => status[s] > 0)
                    .map((s) => `${status[s]}× ${STATUS_LABEL[s]}`)
                    .join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {stats.length > 0 && (
        <div className="card">
          <h2>Allgemeinzustand (Skala 1–5)</h2>
          <table>
            <thead>
              <tr><th>Parameter</th><th>Ø</th><th>Min</th><th>Max</th><th>Einträge</th></tr>
            </thead>
            <tbody>
              {stats.map(([param, s]) => (
                <tr key={param}>
                  <td>{paramLabel(param)}</td>
                  <td>{s.avg.toFixed(1).replace('.', ',')}</td>
                  <td>{s.min}</td>
                  <td>{s.max}</td>
                  <td>{s.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <StateTrends profile={profile} preset={preset} fixedRange={{ from, to }} />

      {remarks.length > 0 && (
        <div className="card">
          <h2>Bemerkungen &amp; Auffälligkeiten</h2>
          {remarks.map((r, idx) => (
            <p key={idx} style={{ margin: '4px 0', fontSize: '0.88rem' }}>
              <span className="hint">
                {fmtDate(r.at)} {fmtTime(r.at)}
              </span>{' '}
              — {r.text}
            </p>
          ))}
        </div>
      )}

      {openQuestions.length > 0 && (
        <div className="card">
          <h2>Fragen für den Termin</h2>
          {openQuestions.map((q) => (
            <p key={q.id} style={{ margin: '4px 0', fontSize: '0.9rem' }}>• {q.text}</p>
          ))}
        </div>
      )}
    </div>
  );
}
