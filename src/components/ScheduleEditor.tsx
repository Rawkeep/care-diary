// Einnahme-Rhythmus komfortabel einstellen: drei Stepper (morgens/mittags/
// abends) statt Freitext — gespeichert wird weiterhin das kompakte Schema
// „1-0-1" (halbe Dosen möglich, z. B. „0,5-0-1").
import { formatSchedule, parseSchedule } from '../utils/schedule';

const SLOTS = [
  { key: 'morning', label: 'Morgens' },
  { key: 'noon', label: 'Mittags' },
  { key: 'evening', label: 'Abends' },
] as const;

const STEP = 0.5;

export function ScheduleEditor({
  value,
  onChange,
}: {
  /** Schema-String („1-0-1") oder undefined = kein Rhythmus */
  value?: string;
  onChange: (schedule: string | undefined) => void;
}) {
  const plan = parseSchedule(value) ?? { morning: 0, noon: 0, evening: 0, slots: 0 };

  function set(key: (typeof SLOTS)[number]['key'], next: number) {
    const p = { ...plan, [key]: Math.max(0, Math.round(next * 2) / 2) };
    onChange(p.morning + p.noon + p.evening === 0 ? undefined : formatSchedule(p));
  }

  return (
    <div>
      <div className="sched-editor">
        {SLOTS.map(({ key, label }) => (
          <div key={key} className="sched-slot">
            <span className="sched-label">{label}</span>
            <div className="sched-stepper">
              <button
                type="button"
                aria-label={`${label} verringern`}
                onClick={() => set(key, plan[key] - STEP)}
                disabled={plan[key] <= 0}
              >
                −
              </button>
              <span className="sched-value">{String(plan[key]).replace('.', ',')}</span>
              <button type="button" aria-label={`${label} erhöhen`} onClick={() => set(key, plan[key] + STEP)}>
                ＋
              </button>
            </div>
          </div>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 6 }}>
        {plan.slots === 0
          ? 'Kein fester Rhythmus (z. B. bei Bedarf) — dann gibt es keinen Tagesstatus.'
          : `Rhythmus ${formatSchedule(plan)} — die App zeigt auf „Heute", was noch offen ist.`}
      </p>
    </div>
  );
}
