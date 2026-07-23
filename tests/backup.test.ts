// Tests für verschlüsseltes Backup (Roundtrip, falsche Passphrase, Manipulation)
// und die Import-Validierung von Export-Dateien.
import { describe, expect, it } from 'vitest';
import { base64ToBytes, bytesToBase64 } from '../src/utils/base64';
import { decryptBackup, encryptBackup, isBackupEnvelope } from '../src/utils/backup';
import { parseExportBundle } from '../src/utils/bundle';

const NOW = '2026-07-23T12:00:00.000Z';

describe('base64', () => {
  it('Roundtrip über Chunk-Grenzen (>32 KiB)', () => {
    const bytes = new Uint8Array(70_000).map((_, i) => i % 251);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });
});

describe('encryptBackup / decryptBackup', () => {
  it('Roundtrip mit korrekter Passphrase', async () => {
    const secret = JSON.stringify({ hello: 'Wörld äöü 🩺' });
    const env = await encryptBackup(secret, 'meine sichere Passphrase', NOW);
    expect(env.format).toBe('care-diary-backup');
    expect(isBackupEnvelope(env)).toBe(true);
    expect(env.dataBase64).not.toContain('hello'); // wirklich verschlüsselt
    await expect(decryptBackup(env, 'meine sichere Passphrase')).resolves.toBe(secret);
  });

  it('falsche Passphrase ⇒ verständlicher Fehler', async () => {
    const env = await encryptBackup('geheim', 'richtig', NOW);
    await expect(decryptBackup(env, 'falsch')).rejects.toThrow(/Passphrase falsch/);
  });

  it('manipulierte Daten ⇒ Fehler (GCM-Authentizität)', async () => {
    const env = await encryptBackup('geheim', 'pass', NOW);
    const bytes = base64ToBytes(env.dataBase64);
    bytes[0] ^= 0xff;
    env.dataBase64 = bytesToBase64(bytes);
    await expect(decryptBackup(env, 'pass')).rejects.toThrow();
  });

  it('jedes Backup nutzt frisches Salt und IV', async () => {
    const a = await encryptBackup('x', 'p', NOW);
    const b = await encryptBackup('x', 'p', NOW);
    expect(a.kdf.saltBase64).not.toBe(b.kdf.saltBase64);
    expect(a.cipher.ivBase64).not.toBe(b.cipher.ivBase64);
  });
});

describe('parseExportBundle', () => {
  const minimal = {
    format: 'care-diary-export',
    version: 2,
    exportedAt: NOW,
    profiles: [],
    medications: [],
    intakes: [],
    events: [],
    observations: [],
    timeline: [],
    questions: [],
  };

  it('akzeptiert v2 (ohne Anhänge) und v3 (mit Anhängen)', () => {
    expect(parseExportBundle(JSON.stringify(minimal)).version).toBe(2);
    expect(
      parseExportBundle(JSON.stringify({ ...minimal, version: 3, attachments: [] })).version
    ).toBe(3);
  });

  it('lehnt fremde/kaputte Dateien verständlich ab', () => {
    expect(() => parseExportBundle('kein json')).toThrow(/kein gültiges JSON/);
    expect(() => parseExportBundle('{"format":"anders"}')).toThrow(/Keine care-diary-Export/);
    expect(() => parseExportBundle(JSON.stringify({ ...minimal, version: 99 }))).toThrow(
      /Unbekannte Export-Version/
    );
    const { questions: _q, ...ohneQuestions } = minimal;
    expect(() => parseExportBundle(JSON.stringify(ohneQuestions))).toThrow(/questions/);
    expect(() => parseExportBundle(JSON.stringify({ ...minimal, version: 3 }))).toThrow(
      /attachments/
    );
  });
});
