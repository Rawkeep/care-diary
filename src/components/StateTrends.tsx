// „Zustands-Verlauf": dezente Small-Multiples-Karte — je Zustands-Parameter
// eine Sparkline plus Ereignis-Streifen auf gemeinsamer Zeitachse, damit
// Phasen erkennbar werden. Reine Darstellung, keine Bewertung (KONZEPT §3.6).
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Profile } from '../db/models';
import type { ConditionPreset } from '../presets/epilepsy';
import { eventCountByDay, inDayRange } from '../utils/aggregate';
import { measurementSeries, stateByEventProximity } from '../utils/correlation';
import { dayKeyDaysAgo, fmtDayKey, localDayKey } from '../utils/date';
import { dayRange, seriesForParam, smoothSeries } from '../utils/trend';
import { EventStrip, TrendChart } from './TrendChart';

const fmtAvg = (v: number) => v.toFixed(1).replace('.', ',');

const RANGES = [
  { label: '4 Wochen', days: 28 },
  { label: '12 Wochen', days: 84 },
  { label: '1 Jahr', days: 365 },
];

const MAX_DAYS = 366;

export function StateTrends({
  profile,
  preset,
  fixedRange,
}: {
  profile: Profile;
  preset: ConditionPreset;
  /** Gesetzt (z. B. im Arztbericht): fester Zeitraum, kein Umschalter */
  fixedRange?: { from: string; to: string };
}) {
  const [rangeDays, setRangeDays] = useState(84);
  const observations = useLiveQuery(
    () => db.observations.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const events = useLiveQuery(() => db.events.where('profileId').equals(profile.id).toArray(), [profile.id]);
  const measurements = useLiveQuery(
    () => db.measurements.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );

  if (!observations || !events || !measurements) return null;

  const to = fixedRange?.to ?? localDayKey(new Date().toISOString());
  const from = fixedRange?.from ?? dayKeyDaysAgo(rangeDays - 1);

  let obsR = inDayRange(observations, (o) => o.at, from, to);
  let evR = inDayRange(events, (e) => e.startedAt, from, to);

  // Degenerierte Zeiträume („gesamt") auf dokumentierte Daten begrenzen
  const dataDays = [...obsR.map((o) => localDayKey(o.at)), ...evR.map((e) => localDayKey(e.startedAt))].sort();
  const effectiveFrom = dataDays.length > 0 && dataDays[0] > from ? dataDays[0] : from;
  let days = dayRange(effectiveFrom, to);
  let truncated = false;
  if (days.length > MAX_DAYS) {
    days = days.slice(-MAX_DAYS);
    truncated = true;
    obsR = inDayRange(obsR, (o) => o.at, days[0], to);
    evR = inDayRange(evR, (e) => e.startedAt, days[0], to);
  }

  const counts = eventCountByDay(evR);

  // Gewichtsverlauf im selben Fenster (eigene Werteskala)
  const weightR = inDayRange(
    measurements.filter((m) => m.kind === 'weight'),
    (m) => m.at,
    days[0],
    to
  );
  const weightPoints = measurementSeries(weightR, days);
  const wVals = weightPoints.map((p) => p.value);
  const wMin = Math.floor(Math.min(...wVals, Infinity) - 1);
  const wMax = Math.ceil(Math.max(...wVals, -Infinity) + 1);

  // Zustand im Vergleich: Ereignistag+Folgetag vs. ereignisfreie Tage —
  // nur Parameter mit Daten in beiden Gruppen (sonst kein Vergleich möglich)
  const proximity = stateByEventProximity(obsR, evR, 1);
  const comparison = preset.observationParams
    .map((p) => ({ param: p, cmp: proximity.get(p.key) }))
    .filter((r) => r.cmp?.near && r.cmp?.free);

  if (fixedRange && obsR.length === 0 && weightPoints.length === 0) return null; // im Bericht leer → weglassen

  return (
    <div className="card">
      <h2>Zustands-Verlauf</h2>
      {!fixedRange && (
        <div className="tabs trend-ranges">
          {RANGES.map((r) => (
            <button
              key={r.days}
              className={rangeDays === r.days ? 'active' : ''}
              onClick={() => setRangeDays(r.days)}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
      {obsR.length === 0 && weightPoints.length === 0 ? (
        <p className="hint">
          Noch keine Zustands-Daten im Zeitraum — auf „Heute" unter „📝 Zustand" oder „⚖️ Gewicht"
          erfassen.
        </p>
      ) : (
        <>
          {truncated && <p className="hint">Anzeige auf die letzten 12 Monate begrenzt.</p>}
          <EventStrip days={days} counts={counts} />
          {obsR.length > 0 &&
            preset.observationParams.map((p) => {
              const points = seriesForParam(obsR, p.key, days);
              return (
                <TrendChart
                  key={p.key}
                  title={p.label}
                  days={days}
                  points={points}
                  smoothed={smoothSeries(points)}
                />
              );
            })}
          {weightPoints.length > 0 && (
            <TrendChart
              title="Gewicht (kg)"
              days={days}
              points={weightPoints}
              smoothed={smoothSeries(weightPoints)}
              domain={[wMin, wMax]}
              ticks={[wMin, wMax]}
            />
          )}
          <div className="trend-xaxis">
            <span>{fmtDayKey(days[0])}</span>
            <span>{fmtDayKey(days[days.length - 1])}</span>
          </div>
          <p className="hint">
            Linie = geglätteter Verlauf (±3 Tage), Punkte = Tages-Ø. Nur Darstellung — keine
            Bewertung.
          </p>
          {comparison.length > 0 && (
            <>
              <h2 style={{ marginTop: 14 }}>Zustand im Vergleich</h2>
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Ø ereignisfreie Tage</th>
                    <th>Ø Ereignistag + Folgetag</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map(({ param, cmp }) => (
                    <tr key={param.key}>
                      <td>{param.label}</td>
                      <td>
                        {fmtAvg(cmp!.free!.avg)} <span className="hint">({cmp!.free!.n}×)</span>
                      </td>
                      <td>
                        {fmtAvg(cmp!.near!.avg)} <span className="hint">({cmp!.near!.n}×)</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="hint">
                Beschreibender Vergleich dokumentierter Beobachtungen (Skala 1–5, höher = besser
                bzw. unauffälliger). Keine Kausalaussage — die Einordnung gehört ins ärztliche
                Gespräch.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
