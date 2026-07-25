// Icon-Set als Inline-SVG (24er-Raster, Stroke 2, currentColor) — gestochen
// scharf auf jedem Display und automatisch in Theme-Farbe. Bewusst schlicht
// gehalten (Feather-Stil), damit die Icons zurücktreten und Inhalte führen.
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Heute: Klemmbrett mit Haken */
export function IconToday(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1H9Z" />
      <path d="m9 13 2 2 4-4" />
    </Base>
  );
}

/** Verlauf: Kalender */
export function IconHistory(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </Base>
  );
}

/** Medikamente / Einnahme: Kapsel */
export function IconPill(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="2.6" y="8.6" width="18.8" height="7" rx="3.5" transform="rotate(-45 12 12)" />
      <path d="m8.5 8.5 7 7" />
    </Base>
  );
}

/** Mehr: Regler */
export function IconMore(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h13M21 17h-1" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="19" cy="17" r="2" />
    </Base>
  );
}

/** Ereignis / Akut: Blitz */
export function IconEvent(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M13 2 4.5 13.5H11l-1 8.5L18.5 10H12l1-8Z" />
    </Base>
  );
}

/** Zustand: Stift mit Linie */
export function IconState(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M17 3a2.4 2.4 0 0 1 3.4 3.4L8 18.8 3.5 20l1.2-4.5Z" />
      <path d="m14.5 5.5 4 4" />
    </Base>
  );
}

/** Gewicht: Waage */
export function IconWeight(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M7.5 10a4.5 4.5 0 0 1 9 0" />
      <path d="m12 10 2.2-2.2" />
    </Base>
  );
}

/** Notfall: Warn-Dreieck */
export function IconEmergency(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 3 2.8 19a1.2 1.2 0 0 0 1 1.8h16.4a1.2 1.2 0 0 0 1-1.8L12 3Z" />
      <path d="M12 9.5v5M12 17.6v.1" />
    </Base>
  );
}

/** Erledigt: Haken im Kreis */
export function IconDone(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.3 2.3 4.7-5" />
    </Base>
  );
}

/** Uhrzeit: Uhr */
export function IconClock(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Base>
  );
}

/** Dauer: Stoppuhr */
export function IconStopwatch(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 10v3.8l2.6 1.5M9.5 2.5h5M12 2.5V6" />
    </Base>
  );
}

/** Schweregrad: Tacho */
export function IconGauge(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4.5 17.5a8.5 8.5 0 1 1 15 0" />
      <path d="m12 14 3.8-4.2" />
      <circle cx="12" cy="14.5" r="1.4" />
    </Base>
  );
}

/** Umstände: Etiketten */
export function IconTags(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M3 11V4h7l9 9-7 7-9-9Z" />
      <circle cx="7.5" cy="8.5" r="1.2" />
    </Base>
  );
}

/** Notiz: Textzeilen */
export function IconNote(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="4" y="3.5" width="16" height="17" rx="2.5" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </Base>
  );
}

/** Kamera */
export function IconCamera(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4 8h3l1.6-2.4A1.5 1.5 0 0 1 9.9 5h4.2a1.5 1.5 0 0 1 1.3.6L17 8h3a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13.5" r="3.6" />
    </Base>
  );
}

/** Video: Kamera-Korpus mit Linse */
export function IconVideo(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="3" y="6.5" width="13" height="11" rx="2.5" />
      <path d="m16 11 5-3v8l-5-3Z" />
    </Base>
  );
}

/** Mikrofon */
export function IconMic(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" />
    </Base>
  );
}

/** Absetzen: Stopp-Quadrat */
export function IconStop(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="6" y="6" width="12" height="12" rx="2.5" />
    </Base>
  );
}

/** Bearbeiten: Stift */
export function IconEdit(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M17 3a2.4 2.4 0 0 1 3.4 3.4L8 18.8 3.5 20l1.2-4.5Z" />
    </Base>
  );
}

/** Überfällig: Sanduhr */
export function IconHourglass(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M7 3h10M7 21h10" />
      <path d="M8 3v3.5c0 1.4 4 3.6 4 5.5s-4 4.1-4 5.5V21" />
      <path d="M16 3v3.5c0 1.4-4 3.6-4 5.5s4 4.1 4 5.5V21" />
    </Base>
  );
}

/** Jetzt dran: Stecknadel */
export function IconPin(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 21s6.5-7.2 6.5-11a6.5 6.5 0 1 0-13 0C5.5 13.8 12 21 12 21Z" />
      <circle cx="12" cy="10" r="2.4" />
    </Base>
  );
}

/** Information: „i" im Kreis */
export function IconInfo(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.6v.1" />
    </Base>
  );
}

/** Ruhige Phase: Blatt */
export function IconLeaf(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M20 4c0 9-5.4 13.5-11 13.5A5 5 0 0 1 4 12.5C4 7 8.5 4 20 4Z" />
      <path d="M4 20c2.5-6 7-9.5 12-11" />
    </Base>
  );
}

/** Wiederholen / erneut brauchen */
export function IconRefresh(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v4h-4" />
    </Base>
  );
}

/** Meiden: durchgestrichener Kreis */
export function IconBan(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m6.2 6.2 11.6 11.6" />
    </Base>
  );
}

/** App-Sperre: Schloss */
export function IconLock(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </Base>
  );
}

/** Erinnerung: Glocke */
export function IconBell(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M18 16V11a6 6 0 1 0-12 0v5l-1.5 2.5h15L18 16Z" />
      <path d="M9.8 21.2a2.4 2.4 0 0 0 4.4 0" />
    </Base>
  );
}

/** Person / Profil */
export function IconUser(p: IconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20.5a7.4 7.4 0 0 1 14.4 0" />
    </Base>
  );
}

/** Bericht / Dokument */
export function IconDocument(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M6 3h8l4 4v14H6Z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </Base>
  );
}

/** Plan (Begleit-Module): Kalenderblatt mit Haken */
export function IconPlan(p: IconProps) {
  return (
    <Base {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="m8.5 14.5 2 2 4.5-4.5" />
    </Base>
  );
}

/** Verordnung: Rezeptblatt */
export function IconPrescription(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M5.5 3.5h13v17l-3-2-3 2-3-2-4 2Z" />
      <path d="M9 8h4a2 2 0 0 1 0 4H9V8Zm0 4 5 4.5" />
    </Base>
  );
}

/** Bestand: Vorratsdose */
export function IconStock(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Z" />
      <path d="M4 4.5h16V8H4z" />
      <path d="M10 13h4" />
    </Base>
  );
}

/** Ernährung: Apfel */
export function IconNutrition(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M12 8c-1.2-1.3-3-1.8-4.6-1C5.4 8 4.5 10.3 5 12.7c.6 3 3 6.6 5.4 7.5 1 .4 2.2.4 3.2 0 2.4-.9 4.8-4.5 5.4-7.5.5-2.4-.4-4.7-2.4-5.7-1.6-.8-3.4-.3-4.6 1Z" />
      <path d="M12 8c0-1.7.8-3.3 2.5-4" />
    </Base>
  );
}

/** Löschen: Papierkorb */
export function IconTrash(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M4 7h16M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
      <path d="M6.5 7 7.4 20a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
      <path d="M10 11v6M14 11v6" />
    </Base>
  );
}
