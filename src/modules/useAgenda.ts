// Gemeinsame Datenquelle für die proaktiven Hinweise: „Heute" (Karten),
// Plan-Ansicht (vollständige Liste) und ReminderManager (Benachrichtigung)
// sehen garantiert dasselbe, weil alle dieselbe reine Funktion füttern.
//
// Der Minuten-Takt hält die Liste über den Tageswechsel hinweg richtig, ohne
// dass jemand die App neu starten muss.
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Profile } from '../db/models';
import { buildAgenda, type AgendaItem } from '../utils/agenda';
import { localDayKey } from '../utils/date';
import { enabledModules } from './registry';

/** Neuberechnung im Minuten-Takt (Tageswechsel, Fälligkeiten) */
const TICK_MS = 60_000;

export function useAgenda(profile: Profile): AgendaItem[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => clearInterval(t);
  }, []);

  const active = enabledModules(profile.modules);
  const medications = useLiveQuery(
    () => db.medications.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const intakes = useLiveQuery(
    () => db.intakes.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const prescriptions = useLiveQuery(
    () => db.prescriptions.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const stocks = useLiveQuery(
    () => db.stocks.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );
  const appointments = useLiveQuery(
    () => db.appointments.where('profileId').equals(profile.id).toArray(),
    [profile.id]
  );

  if (active.length === 0) return [];
  if (!medications || !intakes || !prescriptions || !stocks || !appointments) return [];

  const now = new Date();
  return buildAgenda({
    profile,
    medications,
    intakes,
    prescriptions,
    stocks,
    appointments,
    todayKey: localDayKey(now.toISOString()),
    nowIso: now.toISOString(),
  });
}
