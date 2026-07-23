// Verschlüsseltes Backup — WebCrypto, komplett lokal:
// AES-256-GCM, Schlüssel aus Passphrase via PBKDF2-SHA-256.
// Dateiformat ist ein selbstbeschreibendes JSON-Envelope (.cdbak), damit
// eine Wiederherstellung auch in Jahren noch nachvollziehbar ist.
import { base64ToBytes, bytesToBase64 } from './base64';

export const BACKUP_FORMAT = 'care-diary-backup';
export const PBKDF2_ITERATIONS = 310_000;

export interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  version: 1;
  createdAt: string;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; saltBase64: string };
  cipher: { name: 'AES-GCM'; ivBase64: string };
  dataBase64: string;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt.buffer as ArrayBuffer, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptBackup(
  plaintext: string,
  passphrase: string,
  createdAt: string
): Promise<BackupEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    new TextEncoder().encode(plaintext)
  );
  return {
    format: BACKUP_FORMAT,
    version: 1,
    createdAt,
    kdf: {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: PBKDF2_ITERATIONS,
      saltBase64: bytesToBase64(salt),
    },
    cipher: { name: 'AES-GCM', ivBase64: bytesToBase64(iv) },
    dataBase64: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

/** Wirft bei falscher Passphrase oder manipulierter Datei (GCM-Auth schlägt fehl). */
export async function decryptBackup(envelope: BackupEnvelope, passphrase: string): Promise<string> {
  if (envelope.format !== BACKUP_FORMAT) {
    throw new Error('Keine care-diary-Backup-Datei.');
  }
  const salt = base64ToBytes(envelope.kdf.saltBase64);
  const iv = base64ToBytes(envelope.cipher.ivBase64);
  const key = await deriveKey(passphrase, salt, envelope.kdf.iterations);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      base64ToBytes(envelope.dataBase64).buffer as ArrayBuffer
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error('Entschlüsselung fehlgeschlagen — Passphrase falsch oder Datei beschädigt.');
  }
}

/** Erkennt am Inhalt, ob eine Datei ein verschlüsseltes Backup oder ein Klartext-Export ist. */
export function isBackupEnvelope(parsed: unknown): parsed is BackupEnvelope {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    (parsed as { format?: unknown }).format === BACKUP_FORMAT
  );
}
