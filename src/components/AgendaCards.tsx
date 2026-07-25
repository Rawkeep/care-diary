// Proaktive Hinweise als Karten — auf „Heute" gekürzt, im Plan vollständig.
// Ton: sachlich, mit Zahl und Datum, ohne Ausrufezeichen und ohne Vorwurf.
// Ein Tipp führt in die Plan-Ansicht, wo man die Sache erledigen kann.
import type { AgendaItem, AgendaSeverity } from '../utils/agenda';
import { moduleLabel } from '../modules/registry';

const SEVERITY_ICON: Record<AgendaSeverity, string> = {
  overdue: '⏳',
  due: '📌',
  soon: '🗓',
  info: 'ℹ️',
};

const SEVERITY_WORD: Record<AgendaSeverity, string> = {
  overdue: 'überfällig',
  due: 'jetzt dran',
  soon: 'bald',
  info: 'zur Info',
};

export function AgendaCards({
  items,
  max,
  onOpen,
  title = 'Im Blick behalten',
}: {
  items: AgendaItem[];
  /** Kürzung für die Startseite; ohne Angabe wird alles gezeigt */
  max?: number;
  /** Sprung in die Plan-Ansicht (auf „Heute"); im Plan selbst weglassen */
  onOpen?: () => void;
  title?: string;
}) {
  if (items.length === 0) return null;
  const shown = max != null ? items.slice(0, max) : items;
  const hidden = items.length - shown.length;

  return (
    <div className="card agenda-card">
      <h2>
        {title} <span className="agenda-count">{items.length}</span>
      </h2>
      <div className="agenda">
        {shown.map((item) => {
          const Row = onOpen ? 'button' : 'div';
          return (
            <Row
              key={item.key}
              className={`agenda-item sev-${item.severity}`}
              {...(onOpen
                ? { onClick: onOpen, type: 'button' as const, 'aria-label': `${item.title} — im Plan öffnen` }
                : {})}
            >
              <span className="agenda-icon" aria-hidden="true">
                {SEVERITY_ICON[item.severity]}
              </span>
              <span className="agenda-body">
                <span className="agenda-title">{item.title}</span>
                <span className="agenda-detail">{item.detail}</span>
                <span className="agenda-tag">
                  {moduleLabel(item.module)} · {SEVERITY_WORD[item.severity]}
                </span>
              </span>
            </Row>
          );
        })}
      </div>
      {hidden > 0 && onOpen && (
        <button className="btn secondary" onClick={onOpen}>
          {hidden === 1 ? 'Einen weiteren Punkt' : `${hidden} weitere Punkte`} im Plan ansehen
        </button>
      )}
    </div>
  );
}
