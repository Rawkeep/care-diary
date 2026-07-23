// Bestätigungs-Toast mit optionalem „Rückgängig" — gibt bei der
// Ein-Tipp-Erfassung sofortiges Feedback und macht Fehltipps folgenlos.
import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

const DISMISS_MS = 6000;

export function Toast() {
  const { toast, clearToast } = useAppStore();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, DISMISS_MS);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;

  async function undo() {
    await toast?.undo?.();
    clearToast();
  }

  return (
    <div className="toast" role="status">
      <span className="toast-msg">{toast.message}</span>
      {toast.undo && (
        <button className="toast-undo" onClick={undo}>
          Rückgängig
        </button>
      )}
    </div>
  );
}
