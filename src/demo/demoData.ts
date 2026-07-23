// Demo-Profil „Mia (Demo)" — 12 Wochen realistische Beispieldaten, damit
// die App sich in vollem Umfang zeigen lässt: Medikamente mit laufendem
// Ausschleich-Plan, Einnahmen, Ereignisse (auch nachts), Zustands-Muster
// (schlechter nach Ereignissen), Gewichtsverlauf, Nebenwirkungs-Notizen,
// Lebens-Historie, Fragen und ausgefüllter Umfeld-Bericht.
// Alles hängt an EINER Profil-ID — die Löschung entfernt rückstandslos.
import type {
  CareReportVariant,
  HealthEvent,
  Intake,
  Measurement,
  Medication,
  Observation,
  Profile,
  Question,
  SideEffectNote,
  TimelineEntry,
} from '../db/models';
import { newId } from '../db/models';
import { db } from '../db/db';
import { effectiveDose } from '../utils/dose';
import { localDayKey } from '../utils/date';

/** deterministischer Zufall (LCG) — die Demo sieht immer gleich gut aus */
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

export interface DemoData {
  profile: Profile;
  medications: Medication[];
  intakes: Intake[];
  events: HealthEvent[];
  observations: Observation[];
  measurements: Measurement[];
  sideEffects: SideEffectNote[];
  timeline: TimelineEntry[];
  questions: Question[];
  careReports: CareReportVariant[];
}

export function buildDemoData(now: Date): DemoData {
  const rng = makeRng(20260723);
  const profileId = newId();
  const at = (daysAgo: number, hour: number, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const day = (daysAgo: number) => localDayKey(at(daysAgo, 12));
  const nowIsoStr = now.toISOString();

  const profile: Profile = {
    id: profileId,
    name: 'Mia (Demo)',
    birthDate: `${now.getFullYear() - 9}-03-14`,
    conditions: ['epilepsy'],
    allergies: ['Erdnüsse (schwer)', 'Laktose'],
    isDemo: true,
    createdAt: nowIsoStr,
  };

  const keppra: Medication = {
    id: newId(),
    profileId,
    name: 'Levetiracetam',
    substance: 'Levetiracetam',
    dose: 500,
    unit: 'mg',
    schedule: '1-0-1',
    doseSteps: [
      { fromDate: day(90), dose: 400, note: 'lt. Dr. Weber' },
      { fromDate: day(14), dose: 300, note: 'lt. Dr. Weber, Kontrolle in 4 Wochen' },
      { fromDate: day(-21), dose: 200 },
    ],
    isEmergency: false,
    startDate: day(120),
    createdAt: nowIsoStr,
  };
  const buccolam: Medication = {
    id: newId(),
    profileId,
    name: 'Buccolam',
    substance: 'Midazolam',
    dose: 10,
    unit: 'mg',
    isEmergency: true,
    startDate: day(120),
    createdAt: nowIsoStr,
  };

  // Ereignisse über 12 Wochen — Häufung nach der Reduktion vor 14 Tagen
  const mkEvent = (
    daysAgo: number,
    hour: number,
    minute: number,
    type: string,
    extra: Partial<HealthEvent> = {}
  ): HealthEvent => ({
    id: newId(),
    profileId,
    type,
    startedAt: at(daysAgo, hour, minute),
    circumstances: [],
    createdAt: nowIsoStr,
    ...extra,
  });
  const events: HealthEvent[] = [
    mkEvent(82, 14, 30, 'absence', { severity: 1, circumstances: ['Flackerlicht / Bildschirm'] }),
    mkEvent(74, 3, 10, 'tonic_clonic', {
      severity: 4,
      durationSeconds: 150,
      circumstances: ['Aus dem Schlaf heraus', 'Schlafmangel'],
      postPhaseMinutes: 45,
      note: 'Danach sehr müde, bis mittags geschlafen.',
    }),
    mkEvent(63, 9, 15, 'absence', { severity: 1 }),
    mkEvent(55, 7, 40, 'myoclonic', { severity: 2, circumstances: ['Schlafmangel'] }),
    mkEvent(41, 16, 5, 'absence', { severity: 1, aura: true }),
    mkEvent(29, 2, 45, 'tonic_clonic', {
      severity: 5,
      durationSeconds: 210,
      circumstances: ['Aus dem Schlaf heraus'],
      emergencyMedicationGiven: true,
      postPhaseMinutes: 60,
      note: 'Buccolam nach 3 Minuten gegeben, wie mit Dr. Weber besprochen.',
    }),
    mkEvent(16, 11, 20, 'absence', { severity: 1 }),
    mkEvent(9, 15, 35, 'absence', {
      severity: 2,
      note: 'Erste Absence nach der Reduktion auf 300 mg.',
    }),
    mkEvent(5, 4, 5, 'tonic_clonic', {
      severity: 3,
      durationSeconds: 120,
      circumstances: ['Aus dem Schlaf heraus'],
      postPhaseMinutes: 30,
    }),
    mkEvent(2, 10, 50, 'absence', { severity: 1 }),
  ];
  const eventDays = new Set(events.map((e) => localDayKey(e.startedAt)));

  // Einnahmen der letzten 28 Tage (1-0-1), 2× vergessen, 1× verspätet
  const intakes: Intake[] = [];
  for (let d = 27; d >= 0; d--) {
    for (const [slotHour, slotMin] of [
      [8, 3],
      [19, 12],
    ] as const) {
      const isMissed = (d === 6 && slotHour === 19) || (d === 20 && slotHour === 8);
      const isLate = d === 13 && slotHour === 8;
      const iso = at(d, isLate ? 10 : slotHour, isLate ? 25 : slotMin + Math.floor(rng() * 9));
      intakes.push({
        id: newId(),
        profileId,
        medicationId: keppra.id,
        at: iso,
        amount: effectiveDose(keppra, iso),
        unit: keppra.unit,
        status: isMissed ? 'missed' : isLate ? 'late' : 'taken',
        note: isMissed && d === 6 ? 'Bei Oma übernachtet, Dose vergessen.' : undefined,
        createdAt: nowIsoStr,
      });
    }
  }

  // Zustand über 12 Wochen — an Ereignistagen und Folgetagen sichtbar schlechter
  const observations: Observation[] = [];
  const params = ['energy', 'mood', 'sleep', 'behavior', 'speech'] as const;
  for (let d = 83; d >= 0; d--) {
    if (rng() < 0.3) continue; // nicht jeden Tag dokumentiert — realistisch
    const key = day(d);
    const nearEvent = eventDays.has(key) || eventDays.has(day(d + 1));
    for (const parameter of params) {
      if (rng() < 0.25) continue;
      const base = 4 + (rng() < 0.35 ? 1 : 0);
      const raw = nearEvent ? base - 2 - (rng() < 0.4 ? 1 : 0) : base - (rng() < 0.3 ? 1 : 0);
      const value = Math.min(5, Math.max(1, raw)) as Observation['value'];
      observations.push({
        id: newId(),
        profileId,
        parameter,
        value,
        at: at(d, 19, 30),
        note:
          nearEvent && parameter === 'speech' && rng() < 0.5
            ? 'Spricht heute deutlich undeutlicher als sonst.'
            : undefined,
        createdAt: nowIsoStr,
      });
    }
  }

  // Gewicht: langsame Zunahme über 12 Wochen (passt zur Nebenwirkungs-Notiz)
  const measurements: Measurement[] = [];
  for (let i = 0; i < 12; i++) {
    measurements.push({
      id: newId(),
      profileId,
      kind: 'weight',
      value: Math.round((24 + i * 0.2 + rng() * 0.2) * 10) / 10,
      unit: 'kg',
      at: at(77 - i * 7, 7, 45),
      createdAt: nowIsoStr,
    });
  }

  const sideEffects: SideEffectNote[] = [
    {
      id: newId(),
      profileId,
      medicationId: keppra.id,
      text: 'Seit ca. 8 Wochen deutlich mehr Appetit — Gewicht rund 2 kg rauf.',
      at: at(35, 18, 0),
      createdAt: nowIsoStr,
    },
    {
      id: newId(),
      profileId,
      medicationId: keppra.id,
      text: 'Nachmittags oft müde, besonders nach der Schule.',
      at: at(21, 17, 30),
      createdAt: nowIsoStr,
    },
  ];

  const timeline: TimelineEntry[] = [
    {
      id: newId(),
      profileId,
      kind: 'diagnosis',
      date: day(730),
      approximate: true,
      title: 'Diagnose Epilepsie (Absencen)',
      note: 'Nach zwei beobachteten Absencen in der Schule.',
      createdAt: nowIsoStr,
    },
    {
      id: newId(),
      profileId,
      kind: 'hospital',
      date: day(240),
      title: 'Stationäre EEG-Überwachung (3 Tage)',
      createdAt: nowIsoStr,
    },
    {
      id: newId(),
      profileId,
      kind: 'appointment',
      date: day(95),
      title: 'Kontrolltermin Dr. Weber — Ausschleichen begonnen',
      createdAt: nowIsoStr,
    },
  ];

  const questions: Question[] = [
    {
      id: newId(),
      profileId,
      text: 'Zwei große Anfälle seit der Reduktion — Stufe halten oder zurück auf 400 mg?',
      createdAt: at(4, 20, 0),
    },
    {
      id: newId(),
      profileId,
      text: 'Gewichtszunahme unter Levetiracetam — worauf sollen wir achten?',
      createdAt: at(20, 20, 0),
    },
  ];

  const careReports: CareReportVariant[] = [
    {
      id: newId(),
      profileId,
      name: 'Schule',
      language: 'de',
      aboutText:
        'Mia hat Epilepsie. Meistens merkt man ihr nichts an — manchmal hat sie kurze Absencen (wenige Sekunden „weggetreten") und selten einen großen Anfall.',
      helpsText:
        'Nach einer Absence einfach kurz den Faden aufnehmen („wir sind bei Aufgabe 3") — kein Aufheben machen. Bei Müdigkeit nach einem Anfall darf sie sich ins Ruhezimmer legen.',
      avoidText:
        'Flackerlicht und Stroboskop (Schulfeste!), Übermüdung auf Klassenfahrten, Sonderbehandlung vor der Klasse.',
      doctorPlanText:
        'Bei einem großen Anfall länger als 3 Minuten: Buccolam 10 mg in die Wangentasche, wie eingewiesen — und die Eltern anrufen.',
      contactsText: 'Mama: 0170 000000 · Papa: 0151 000000 — lieber einmal zu oft anrufen.',
      includeFrequency: false,
      includeEventTypes: true,
      includeTriggers: true,
      includeEmergencyMeds: true,
      includeAllergies: true,
      updatedAt: nowIsoStr,
    },
  ];

  return {
    profile,
    medications: [keppra, buccolam],
    intakes,
    events,
    observations,
    measurements,
    sideEffects,
    timeline,
    questions,
    careReports,
  };
}

/** Demo-Profil anlegen und Profil-ID zurückgeben */
export async function createDemoProfile(): Promise<string> {
  const data = buildDemoData(new Date());
  await db.transaction(
    'rw',
    [db.profiles, db.medications, db.intakes, db.events, db.observations, db.measurements, db.sideEffects, db.timeline, db.questions, db.careReports],
    async () => {
      await db.profiles.add(data.profile);
      await db.medications.bulkAdd(data.medications);
      await db.intakes.bulkAdd(data.intakes);
      await db.events.bulkAdd(data.events);
      await db.observations.bulkAdd(data.observations);
      await db.measurements.bulkAdd(data.measurements);
      await db.sideEffects.bulkAdd(data.sideEffects);
      await db.timeline.bulkAdd(data.timeline);
      await db.questions.bulkAdd(data.questions);
      await db.careReports.bulkAdd(data.careReports);
    }
  );
  return data.profile.id;
}

/** Löscht ALLE Daten eines Profils rückstandslos (inkl. Anhänge) */
export async function deleteProfileData(profileId: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.profiles, db.medications, db.intakes, db.events, db.observations, db.measurements, db.sideEffects, db.timeline, db.questions, db.careReports, db.attachments],
    async () => {
      for (const table of [
        db.medications,
        db.intakes,
        db.events,
        db.observations,
        db.measurements,
        db.sideEffects,
        db.timeline,
        db.questions,
        db.careReports,
        db.attachments,
      ]) {
        await table.where('profileId').equals(profileId).delete();
      }
      await db.profiles.delete(profileId);
    }
  );
}
