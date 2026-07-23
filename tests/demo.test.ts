// Tests für den Demo-Daten-Builder: Konsistenz und erzählerische Invarianten.
import { describe, expect, it } from 'vitest';
import { buildDemoData } from '../src/demo/demoData';
import { localDayKey } from '../src/utils/date';

const NOW = new Date(2026, 6, 23, 12, 0, 0);

describe('buildDemoData', () => {
  const data = buildDemoData(NOW);
  const pid = data.profile.id;

  it('alles hängt an einer Profil-ID (rückstandslos löschbar)', () => {
    const rows = [
      ...data.medications,
      ...data.intakes,
      ...data.events,
      ...data.observations,
      ...data.measurements,
      ...data.sideEffects,
      ...data.timeline,
      ...data.questions,
      ...data.careReports,
    ];
    expect(rows.length).toBeGreaterThan(100);
    expect(rows.every((r) => r.profileId === pid)).toBe(true);
    expect(data.profile.isDemo).toBe(true);
  });

  it('Medikation erzählt die Ausschleich-Geschichte (laufender Plan)', () => {
    const keppra = data.medications.find((m) => !m.isEmergency)!;
    const steps = keppra.doseSteps!;
    expect(steps.map((s) => s.dose)).toEqual([400, 300, 200]);
    const today = localDayKey(NOW.toISOString());
    expect(steps[1].fromDate <= today).toBe(true); // Stufe 2 aktiv
    expect(steps[2].fromDate > today).toBe(true); // Stufe 3 steht bevor
    expect(data.medications.some((m) => m.isEmergency)).toBe(true);
  });

  it('Einnahmen: Status-Mix inkl. vergessen/verspätet, Dosis folgt dem Plan', () => {
    const statuses = new Set(data.intakes.map((i) => i.status));
    expect(statuses.has('taken')).toBe(true);
    expect(statuses.has('missed')).toBe(true);
    expect(statuses.has('late')).toBe(true);
    const amounts = new Set(data.intakes.map((i) => i.amount));
    expect(amounts.has(400)).toBe(true); // vor der Reduktion
    expect(amounts.has(300)).toBe(true); // nach der Reduktion
  });

  it('Ereignisse: auch nachts und mit Notfallmedikation', () => {
    const night = data.events.filter((e) => new Date(e.startedAt).getHours() < 6);
    expect(night.length).toBeGreaterThanOrEqual(3);
    expect(data.events.some((e) => e.emergencyMedicationGiven)).toBe(true);
    expect(data.events.every((e) => localDayKey(e.startedAt) <= localDayKey(NOW.toISOString()))).toBe(true);
  });

  it('Zustand: nahe an Ereignissen sichtbar schlechter (Muster-Demo)', () => {
    const eventDays = new Set(data.events.map((e) => localDayKey(e.startedAt)));
    const near: number[] = [];
    const free: number[] = [];
    for (const o of data.observations) {
      const d = new Date(o.at);
      const key = localDayKey(o.at);
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 1);
      (eventDays.has(key) || eventDays.has(localDayKey(prev.toISOString())) ? near : free).push(o.value);
    }
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(near.length).toBeGreaterThan(5);
    expect(avg(free) - avg(near)).toBeGreaterThan(1);
  });

  it('Gewicht steigt über die Wochen (passt zur Nebenwirkungs-Notiz)', () => {
    const sorted = [...data.measurements].sort((a, b) => a.at.localeCompare(b.at));
    expect(sorted.length).toBe(12);
    expect(sorted[sorted.length - 1].value).toBeGreaterThan(sorted[0].value + 1.5);
    expect(data.sideEffects.length).toBeGreaterThan(0);
  });

  it('Umfeld-Bericht ist ausgefüllt und deterministisch gleich', () => {
    expect(data.careReports[0].doctorPlanText).toContain('Buccolam');
    const again = buildDemoData(NOW);
    expect(again.intakes.length).toBe(data.intakes.length);
    expect(again.observations.length).toBe(data.observations.length);
  });
});
