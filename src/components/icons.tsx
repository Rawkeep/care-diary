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

/** Bearbeiten: Stift */
export function IconEdit(p: IconProps) {
  return (
    <Base {...p}>
      <path d="M17 3a2.4 2.4 0 0 1 3.4 3.4L8 18.8 3.5 20l1.2-4.5Z" />
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
