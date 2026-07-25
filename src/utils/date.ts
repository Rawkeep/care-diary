// Datums-Helfer — deutsche Formatierung, lokale Zeitzone.

/** ISO-Tag (YYYY-MM-DD) in lokaler Zeitzone */
export function localDayKey(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Sekunden → „mm:ss" bzw. „h:mm:ss" */
export function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/** Day-Key von vor N Tagen (lokale Zeitzone) */
export function dayKeyDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDayKey(d.toISOString());
}

/** Day-Key (YYYY-MM-DD) → deutsche Datumsanzeige */
export function fmtDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Für <input type="datetime-local">: lokale Zeit ohne Sekunden */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}

// --- Rechnen mit Day-Keys (YYYY-MM-DD) ---------------------------------
// Bewusst über UTC-Mittag gerechnet: so verschiebt keine Sommerzeit-Umstellung
// einen Tag und dieselbe Eingabe liefert überall dasselbe Ergebnis.

function dayKeyToUtc(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function utcToDayKey(d: Date): string {
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

/** Day-Key + N Tage (N darf negativ sein) */
export function addDaysToDayKey(dayKey: string, days: number): string {
  const d = dayKeyToUtc(dayKey);
  d.setUTCDate(d.getUTCDate() + days);
  return utcToDayKey(d);
}

/**
 * Day-Key + N Monate. Zu kurze Monate werden auf den letzten Tag begrenzt
 * (31.01. + 1 Monat = 28./29.02.) — so wandert eine Quartalskontrolle nicht
 * versehentlich in den Folgemonat.
 */
export function addMonthsToDayKey(dayKey: string, months: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1, 12));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return utcToDayKey(target);
}

/** Ganze Tage von `from` bis `to` (negativ = `to` liegt in der Vergangenheit) */
export function daysBetweenDayKeys(from: string, to: string): number {
  const ms = dayKeyToUtc(to).getTime() - dayKeyToUtc(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** „in 3 Tagen" / „heute" / „vor 2 Tagen" — für Fristen und Termine */
export function fmtRelativeDays(days: number): string {
  if (days === 0) return 'heute';
  if (days === 1) return 'morgen';
  if (days === -1) return 'gestern';
  return days > 0 ? `in ${days} Tagen` : `vor ${-days} Tagen`;
}

/** „1 Tag" / „5 Tage" (korrekter Singular) */
export function fmtDays(days: number): string {
  return `${days} ${Math.abs(days) === 1 ? 'Tag' : 'Tage'}`;
}

/**
 * Dativ-Form für Zeitangaben nach Präpositionen: „in 5 **Tagen**", „seit 8
 * Tagen", „vor 3 Tagen". `fmtDays` steht im Nominativ („noch 5 Tage") und
 * liest sich nach „in/seit/vor" falsch.
 */
export function fmtDaysDative(days: number): string {
  return `${days} ${Math.abs(days) === 1 ? 'Tag' : 'Tagen'}`;
}
