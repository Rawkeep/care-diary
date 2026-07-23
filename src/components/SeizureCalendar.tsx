// Monatsraster mit Ereignis-Markierungen — das Format des klassischen
// Papier-Anfallskalenders, das Neurolog:innen kennen.
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function SeizureCalendar({
  year,
  month,
  counts,
}: {
  year: number;
  /** 0-basiert (Januar = 0) */
  month: number;
  /** Ereignis-Anzahl je Day-Key (YYYY-MM-DD) */
  counts: Map<string, number>;
}) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Wochenstart Montag
  const pad = (n: number) => String(n).padStart(2, '0');
  const title = first.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  return (
    <div className="cal">
      <p className="cal-title">{title}</p>
      <div className="cal-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="wd">{w}</div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`lead-${i}`} className="cal-cell empty" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const key = `${year}-${pad(month + 1)}-${pad(day)}`;
          const count = counts.get(key) ?? 0;
          return (
            <div key={key} className={`cal-cell${count > 0 ? ' has-events' : ''}`}>
              <span>{day}</span>
              {count > 0 && <span className="cnt">{count}×</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
