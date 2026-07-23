import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { verifyPin } from '../utils/pin';

export function LockScreen() {
  const unlock = useAppStore((s) => s.unlock);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  async function tryUnlock() {
    if (await verifyPin(pin)) {
      setError(false);
      unlock();
    } else {
      setError(true);
      setPin('');
    }
  }

  return (
    <div className="lock-screen">
      <span style={{ fontSize: '2.5rem' }}>🔒</span>
      <h1 style={{ fontSize: '1.1rem', margin: 0 }}>care-diary ist gesperrt</h1>
      <input
        type="password"
        inputMode="numeric"
        autoFocus
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && tryUnlock()}
        aria-label="PIN"
        placeholder="PIN"
      />
      {error && <p className="hint" style={{ color: 'var(--danger)' }}>Falsche PIN — bitte erneut versuchen.</p>}
      <button className="btn" style={{ maxWidth: 220 }} onClick={tryUnlock} disabled={pin.length === 0}>
        Entsperren
      </button>
    </div>
  );
}
