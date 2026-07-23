// PIN-Sperre — Zugriffsschutz vor neugierigen Blicken auf geteilten Geräten.
// Gespeichert wird nur ein gesalzener SHA-256-Hash, nie die PIN selbst.
// Bewusst kein Verschlüsselungsersatz (die Daten in IndexedDB bleiben
// unverschlüsselt) — das kommuniziert die UI transparent.
const HASH_KEY = 'care-diary.pinHash';
const SALT_KEY = 'care-diary.pinSalt';

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hasPin(): boolean {
  return localStorage.getItem(HASH_KEY) !== null;
}

export async function setPin(pin: string): Promise<void> {
  const salt = crypto.randomUUID();
  localStorage.setItem(SALT_KEY, salt);
  localStorage.setItem(HASH_KEY, await hashPin(pin, salt));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const hash = localStorage.getItem(HASH_KEY);
  const salt = localStorage.getItem(SALT_KEY) ?? '';
  return hash !== null && hash === (await hashPin(pin, salt));
}

export function clearPin(): void {
  localStorage.removeItem(HASH_KEY);
  localStorage.removeItem(SALT_KEY);
}
