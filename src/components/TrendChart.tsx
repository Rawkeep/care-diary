// Dezente Sparklines für den Zustands-Verlauf: eine Kurve je Parameter
// (Small Multiples statt Linien-Spaghetti), feste 1–5-Skala, eine Farbe —
// Identität trägt der Titel, nicht die Farbe. Punkte = Tages-Ø (roh),
// Linie = geglätteter Verlauf. Hover/Touch zeigt den nächstgelegenen Wert.
import { useState } from 'react';
import type { PointerEvent } from 'react';
import type { TrendPoint } from '../utils/trend';
import { fmtDayKey } from '../utils/date';

const W = 600;
const H = 90;
const L = 22; // Platz für y-Beschriftung
const R = 40; // Platz für Endwert-Label
const T = 10;
const B = 10;

function fmtValue(v: number): string {
  return v.toFixed(1).replace('.', ',');
}

export function TrendChart({
  title,
  days,
  points,
  smoothed,
}: {
  title: string;
  days: string[];
  points: TrendPoint[];
  smoothed: TrendPoint[];
}) {
  const [hover, setHover] = useState<TrendPoint | null>(null);
  const n = Math.max(days.length - 1, 1);
  const x = (i: number) => L + (i / n) * (W - L - R);
  const y = (v: number) => T + ((5 - v) / 4) * (H - T - B);

  const path = smoothed
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.dayIndex).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(' ');
  const lastSmoothed = smoothed[smoothed.length - 1];

  function onMove(e: PointerEvent<SVGSVGElement>) {
    if (points.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = points[0];
    for (const p of points) {
      if (Math.abs(x(p.dayIndex) - px) < Math.abs(x(best.dayIndex) - px)) best = p;
    }
    setHover(best);
  }

  return (
    <div className="trend">
      <div className="trend-head">
        <span className="trend-title">{title}</span>
        <span className="trend-tip">
          {hover ? `${fmtDayKey(hover.day)} · Ø ${fmtValue(hover.value)}` : ''}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="trend-svg"
        role="img"
        aria-label={`Verlauf ${title}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {[1, 3, 5].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="trend-grid" />
            <text x={L - 6} y={y(v) + 3} className="trend-ytick" textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        {hover && (
          <line
            x1={x(hover.dayIndex)}
            x2={x(hover.dayIndex)}
            y1={T}
            y2={H - B}
            className="trend-cross"
          />
        )}
        {smoothed.length > 1 && <path d={path} className="trend-line" />}
        {points.map((p) => (
          <circle key={p.day} cx={x(p.dayIndex)} cy={y(p.value)} r={2.5} className="trend-dot" />
        ))}
        {lastSmoothed && (
          <text
            x={x(lastSmoothed.dayIndex) + 6}
            y={y(lastSmoothed.value) + 3}
            className="trend-last"
          >
            {fmtValue(lastSmoothed.value)}
          </text>
        )}
        {points.length === 0 && (
          <text x={(L + W - R) / 2} y={H / 2} className="trend-empty" textAnchor="middle">
            keine Daten in diesem Zeitraum
          </text>
        )}
      </svg>
    </div>
  );
}

/** Schmaler Ereignis-Streifen auf derselben Zeitachse — Phasen im Kontext */
export function EventStrip({ days, counts }: { days: string[]; counts: Map<string, number> }) {
  const SH = 24;
  const n = Math.max(days.length - 1, 1);
  const x = (i: number) => L + (i / n) * (W - L - R);
  const max = Math.max(1, ...counts.values());

  return (
    <div className="trend">
      <div className="trend-head">
        <span className="trend-title">⚡ Ereignisse</span>
      </div>
      <svg viewBox={`0 0 ${W} ${SH}`} className="trend-svg" role="img" aria-label="Ereignisse im Zeitraum">
        <line x1={L} x2={W - R} y1={SH - 5} y2={SH - 5} className="trend-grid" />
        {days.map((day, i) => {
          const count = counts.get(day) ?? 0;
          if (count === 0) return null;
          return (
            <line
              key={day}
              x1={x(i)}
              x2={x(i)}
              y1={SH - 5}
              y2={4}
              className="trend-event"
              style={{ opacity: 0.45 + 0.55 * (count / max) }}
            >
              <title>{`${fmtDayKey(day)}: ${count}×`}</title>
            </line>
          );
        })}
      </svg>
    </div>
  );
}
