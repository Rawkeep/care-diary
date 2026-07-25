// Erinnerungen — so weit eine lokale PWA sie ehrlich leisten kann:
// 1) App-Badge (Zahl offener Einnahmen + fälliger Modul-Punkte) auf PWAs,
// 2) System-Benachrichtigung bei GEÖFFNETER App, sobald ein Einnahme-Slot
//    fällig ist (max. eine pro Slot und Tag),
// 3) dieselbe Benachrichtigung für fällige/überfällige Punkte der Begleit-
//    Module (Rezept-Frist, Nachschub, Termin) — je Sachverhalt einmal am Tag.
// Push bei geschlossener App braucht native Builds (Capacitor) — bewusst
// Roadmap, kein Server-Egress.
import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Profile } from '../db/models';
import { useAgenda } from '../modules/useAgenda';
import { isNotifyWorthy } from '../utils/agenda';
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

/**
 * Aufräumen: die „schon benachrichtigt"-Marken tragen den Tag im Schlüssel.
 * Alles, was nicht von heute ist, kann weg — sonst wächst der localStorage
 * mit jedem Modul-Punkt und jedem Tag weiter.
 */
function pruneNotifiedKeys(todayKey: string) {
  const prefix = 'care-diary.notified.';
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(prefix) && !key.includes(`.${todayKey}.`)) localStorage.removeItem(key);
  }
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
  // Proaktive Punkte der aktivierten Module (leer, wenn keines aktiv ist)
  const agenda = useAgenda(profile);
  const dueAgenda = agenda.filter(isNotifyWorthy);
  // Inhalte über eine Ref, Abhängigkeit über die Schlüssel: so läuft der
  // Prüf-Takt nur neu an, wenn sich wirklich etwas an der Lage geändert hat.
  const dueRef = useRef(dueAgenda);
  dueRef.current = dueAgenda;
  const dueKeys = dueAgenda.map((i) => i.key).join('|');

  useEffect(() => {
    if (!medications || !intakes) return;

    function check() {
      const now = new Date();
      const todayKey = localDayKey(now.toISOString());
      const open = openIntakesToday(medications!, intakes!, todayKey);

      // App-Badge (falls unterstützt): offene Einnahmen + fällige Modul-Punkte
      const dueItems = dueRef.current;
      const n = totalOpenSlots(open) + dueItems.length;
      if ('setAppBadge' in navigator) {
        if (n > 0) (navigator as Navigator & { setAppBadge: (n: number) => void }).setAppBadge(n);
        else (navigator as Navigator & { clearAppBadge: () => void }).clearAppBadge?.();
      }

      if (!remindersEnabled() || typeof Notification === 'undefined') return;
      if (Notification.permission !== 'granted') return;

      // Benachrichtigung je fälligem Slot, max. 1× pro Tag und Slot
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      for (const due of dueOpenSlots(open, hhmm)) {
        const key = `care-diary.notified.${profile.id}.${todayKey}.${due.label}`;
        if (localStorage.getItem(key)) continue;
        localStorage.setItem(key, '1');
        notify('care-diary — Einnahme offen', `${due.medNames.join(', ')} (${due.label})`);
      }

      // Modul-Punkte: je Sachverhalt einmal am Tag, nie ein Schwall auf einmal
      for (const item of dueItems) {
        const key = `care-diary.notified.${profile.id}.${todayKey}.${item.key}`;
        if (localStorage.getItem(key)) continue;
        localStorage.setItem(key, '1');
        notify(`care-diary — ${item.title}`, item.detail);
      }
    }

    check();
    pruneNotifiedKeys(localDayKey(new Date().toISOString()));
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, [medications, intakes, dueKeys, profile.id]);

  return null;
}
