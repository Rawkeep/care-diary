// Proaktive Hinweise als Karten — auf „Heute" gekürzt, im Plan vollständig.
//
// Aufbau je Zeile: Symbol (Dringlichkeit) · Titel (kurz, was zu tun ist) ·
// Detail (Zahl und Datum) · Tag (Dringlichkeit) + Modulname. Ton: sachlich,
// ohne Ausrufezeichen und ohne Vorwurf. Ein Tipp führt in die Plan-Ansicht,
// wo man die Sache erledigen kann.
import type { JSX } from 'react';
import type { AgendaItem, AgendaSeverity } from '../utils/agenda';
import { moduleLabel } from '../modules/registry';
import { IconHourglass, IconInfo, IconPin, IconPlan } from './icons';

const SEVERITY: Record<AgendaSeverity, { icon: JSX.Element; word: string; tag: string }> = {
  overdue: { icon: <IconHourglass size={18} />, word: 'überfällig', tag: 'tag danger' },
  due: { icon: <IconPin size={18} />, word: 'jetzt dran', tag: 'tag' },
  soon: { icon: <IconPlan size={18} />, word: 'bald', tag: 'tag quiet' },
  info: { icon: <IconInfo size={18} />, word: 'zur Info', tag: 'tag quiet' },
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
        {title} <span className="tag quiet">{items.length}</span>
      </h2>
      <div className="agenda">
        {shown.map((item) => {
          const sev = SEVERITY[item.severity];
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
                {sev.icon}
              </span>
              <span className="agenda-body">
                <span className="agenda-head">
                  <span className="agenda-title">{item.title}</span>
                  <span className={sev.tag}>{sev.word}</span>
                </span>
                <span className="agenda-detail">{item.detail}</span>
                <span className="agenda-tag">{moduleLabel(item.module)}</span>
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
