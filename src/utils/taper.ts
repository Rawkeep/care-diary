// Ausschleich-/Einschleich-Begleitung — deterministische Aufbereitung des
// dokumentierten Dosisänderungs-Plans (doseSteps): Richtung, Fortschritt,
// Prognose („Ziel erreicht in n Tagen") und Phasen mit Ereigniszählern.
// Die App rechnet keine Pläne aus und empfiehlt nichts — sie bildet die
// ärztliche Verordnung ab und zeigt, was währenddessen dokumentiert wurde.
import type { DoseStep, HealthEvent, Medication } from '../db/models';
import { localDayKey } from './date';

export type TaperDirection = 'down' | 'up' | 'change';

export interface TaperInfo {
  direction: TaperDirection;
  /** sortierte Stufen */
  steps: DoseStep[];
  /** Index der heute gültigen Stufe (-1 = noch vor der ersten Stufe) */
  currentIndex: number;
  currentDose: number;
  /** nächste anstehende Stufe */
  nextDate: string | null;
  nextDose: number | null;
  daysUntilNext: number | null;
  /** letzte Stufe = Ziel */
  endDate: string;
  targetDose: number;
  /** Ziel-Stufe bereits erreicht (heute ≥ letzte Stufe) */
  reached: boolean;
  daysUntilEnd: number | null;
}

function daysBetween(fromDay: string, toDay: string): number {
  const [fy, fm, fd] = fromDay.split('-').map(Number);
  const [ty, tm, td] = toDay.split('-').map(Number);
  return Math.round(
    (new Date(ty, tm - 1, td, 12).getTime() - new Date(fy, fm - 1, fd, 12).getTime()) / 86_400_000
  );
}

/** null, wenn kein Plan dokumentiert ist */
export function taperInfo(med: Medication, todayKey: string): TaperInfo | null {
  const steps = [...(med.doseSteps ?? [])].sort((a, b) => a.fromDate.localeCompare(b.fromDate));
  if (steps.length === 0) return null;

  const target = steps[steps.length - 1].dose;
  const direction: TaperDirection =
    target < med.dose ? 'down' : target > med.dose ? 'up' : 'change';

  let currentIndex = -1;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].fromDate <= todayKey) currentIndex = i;
  }
  const currentDose = currentIndex >= 0 ? steps[currentIndex].dose : med.dose;
  const next = steps[currentIndex + 1] ?? null;
  const endDate = steps[steps.length - 1].fromDate;
  const reached = todayKey >= endDate;

  return {
    direction,
    steps,
    currentIndex,
    currentDose,
    nextDate: next?.fromDate ?? null,
    nextDose: next?.dose ?? null,
    daysUntilNext: next ? daysBetween(todayKey, next.fromDate) : null,
    endDate,
    targetDose: target,
    reached,
    daysUntilEnd: reached ? null : daysBetween(todayKey, endDate),
  };
}

export interface TaperPhase {
  fromDate: string;
  /** exklusives Ende (Beginn der Folgestufe); null = laufend/offen */
  toDate: string | null;
  dose: number;
  /** Phase liegt komplett in der Zukunft */
  upcoming: boolean;
  /** dokumentierte Ereignisse in der Phase (bis heute) */
  eventCount: number;
}

/** Ereignisse je Plan-Stufe — „was ist während der Absetzung passiert?" */
export function taperPhases(
  med: Medication,
  events: HealthEvent[],
  todayKey: string
): TaperPhase[] {
  const steps = [...(med.doseSteps ?? [])].sort((a, b) => a.fromDate.localeCompare(b.fromDate));
  return steps.map((step, i) => {
    const toDate = steps[i + 1]?.fromDate ?? null;
    const upcoming = step.fromDate > todayKey;
    const eventCount = upcoming
      ? 0
      : events.filter((e) => {
          const day = localDayKey(e.startedAt);
          return day >= step.fromDate && (toDate === null || day < toDate) && day <= todayKey;
        }).length;
    return { fromDate: step.fromDate, toDate, dose: step.dose, upcoming, eventCount };
  });
}

export const DIRECTION_LABEL: Record<TaperDirection, string> = {
  down: 'Ausschleichen',
  up: 'Einschleichen',
  change: 'Dosisanpassung',
};
