// Validierung von Import-Dateien (Klartext-Export v2/v3) — bewusst streng,
// damit eine falsche/beschädigte Datei nicht halb importiert wird.
import type { ExportBundle } from '../db/models';

const TABLES = [
  'profiles',
  'medications',
  'intakes',
  'events',
  'observations',
  'timeline',
  'questions',
] as const;

export function parseExportBundle(text: string): ExportBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Datei ist kein gültiges JSON.');
  }
  const b = parsed as Partial<ExportBundle>;
  if (b?.format !== 'care-diary-export') {
    throw new Error('Keine care-diary-Export-Datei (format fehlt oder falsch).');
  }
  const version = b.version;
  if (version !== 2 && version !== 3 && version !== 4 && version !== 5 && version !== 6) {
    throw new Error(`Unbekannte Export-Version: ${String(version)}.`);
  }
  for (const table of TABLES) {
    if (!Array.isArray(b[table])) {
      throw new Error(`Export unvollständig: „${table}" fehlt.`);
    }
  }
  if (version >= 3 && !Array.isArray(b.attachments)) {
    throw new Error('Export unvollständig: „attachments" fehlt (ab v3).');
  }
  if (version >= 4 && (!Array.isArray(b.measurements) || !Array.isArray(b.sideEffects))) {
    throw new Error('Export unvollständig: „measurements"/„sideEffects" fehlt (ab v4).');
  }
  if (version === 5 && !Array.isArray(b.careInfo)) {
    throw new Error('Export unvollständig: „careInfo" fehlt (v5).');
  }
  if (version >= 6 && !Array.isArray(b.careReports)) {
    throw new Error('Export unvollständig: „careReports" fehlt (ab v6).');
  }
  return b as ExportBundle;
}
