// Erinnerungen — so weit eine lokale PWA sie ehrlich leisten kann:
// 1) App-Badge (Zahl offener Einnahmen) auf installierten PWAs,
// 2) System-Benachrichtigung bei GEÖFFNETER App, sobald ein Slot fällig ist
//    (max. eine pro Slot und Tag). Push bei geschlossener App braucht native
//    Builds (Capacitor) — bewusst Roadmap, kein Server-Egress.
import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Profile } from '../db/models';
import { localDayKey } from '../utils/date';
import { dueOpenSlots, openIntakesToday, totalOpenSlots } from '../utils/reminders';

export const REMINDER_PREF_KEY = 'care-diary.reminders';

export function remindersEnabled(): boolean {
  return localStorage.getItem(REMINDER_PREF_KEY) !== 'off';
}

function notify(title: string, body: string) {
  // Android verlangt showNotification über die SW-Registration
  navigator.serviceWorker?.getRegistration().then((reg) => {
    try {
      if (reg) reg.showNotification(title, { body, icon: './icon-192.png' });
      else new Notification(title, { body });
    } catch {
      /* Benachrichtigung ist Komfort — Fehler bewusst still */
    }
  });
}

export function ReminderManager({ profile }: { profile: Profile }) {
  const medications = useLiveQuery(
    () => db.medications.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const intakes = useLiveQuery(
    () => db.intakes.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );

  useEffect(() => {
    if (!medications || !intakes) return;

    function check() {
      const now = new Date();
      const todayKey = localDayKey(now.toISOString());
      const open = openIntakesToday(medications!, intakes!, todayKey);

      // App-Badge (falls unterstützt): Zahl offener Einnahmen heute
      const n = totalOpenSlots(open);
      if ('setAppBadge' in navigator) {
        if (n > 0) (navigator as Navigator & { setAppBadge: (n: number) => void }).setAppBadge(n);
        else (navigator as Navigator & { clearAppBadge: () => void }).clearAppBadge?.();
      }

      // Benachrichtigung je fälligem Slot, max. 1× pro Tag und Slot
      if (!remindersEnabled() || typeof Notification === 'undefined') return;
      if (Notification.permission !== 'granted') return;
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      for (const due of dueOpenSlots(open, hhmm)) {
        const key = `care-diary.notified.${profile.id}.${todayKey}.${due.label}`;
        if (localStorage.getItem(key)) continue;
        localStorage.setItem(key, '1');
        notify('care-diary — Einnahme offen', `${due.medNames.join(', ')} (${due.label})`);
      }
    }

    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, [medications, intakes, profile.id]);

  return null;
}
