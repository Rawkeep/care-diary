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
  if (b.version !== 2 && b.version !== 3 && b.version !== 4 && b.version !== 5) {
    throw new Error(`Unbekannte Export-Version: ${String(b.version)}.`);
  }
  for (const table of TABLES) {
    if (!Array.isArray(b[table])) {
      throw new Error(`Export unvollständig: „${table}" fehlt.`);
    }
  }
  if (b.version >= 3 && !Array.isArray(b.attachments)) {
    throw new Error('Export unvollständig: „attachments" fehlt (ab v3).');
  }
  if (b.version >= 4 && (!Array.isArray(b.measurements) || !Array.isArray(b.sideEffects))) {
    throw new Error('Export unvollständig: „measurements"/„sideEffects" fehlt (ab v4).');
  }
  if (b.version >= 5 && !Array.isArray(b.careInfo)) {
    throw new Error('Export unvollständig: „careInfo" fehlt (ab v5).');
  }
  return b as ExportBundle;
}
