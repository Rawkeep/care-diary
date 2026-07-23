// IndexedDB via Dexie — lokal-first, keine Cloud, kein Egress.
// Indizes auf [profileId+Zeit] tragen Verlaufslisten und Report-Zeiträume.
import Dexie, { type Table } from 'dexie';
import type {
  ExportBundle,
  HealthEvent,
  Intake,
  Medication,
  Observation,
  Profile,
  Question,
  TimelineEntry,
} from './models';
import { nowIso } from './models';

export class CareDiaryDB extends Dexie {
  profiles!: Table<Profile, string>;
  medications!: Table<Medication, string>;
  intakes!: Table<Intake, string>;
  events!: Table<HealthEvent, string>;
  observations!: Table<Observation, string>;
  timeline!: Table<TimelineEntry, string>;
  questions!: Table<Question, string>;

  constructor() {
    super('care-diary');
    this.version(1).stores({
      profiles: 'id',
      medications: 'id, profileId',
      intakes: 'id, profileId, at, [profileId+at]',
      events: 'id, profileId, startedAt, [profileId+startedAt]',
      observations: 'id, profileId, at, [profileId+at]',
      timeline: 'id, profileId, date, [profileId+date]',
    });
    // v2: Fragen-Merkliste für den Arzttermin (bestehende Tabellen unverändert)
    this.version(2).stores({
      questions: 'id, profileId',
    });
  }
}

export const db = new CareDiaryDB();

/** Vollständiger Export aller Daten (JSON) — jederzeit, versioniert. */
export async function buildExportBundle(): Promise<ExportBundle> {
  const [profiles, medications, intakes, events, observations, timeline, questions] =
    await Promise.all([
      db.profiles.toArray(),
      db.medications.toArray(),
      db.intakes.toArray(),
      db.events.toArray(),
      db.observations.toArray(),
      db.timeline.toArray(),
      db.questions.toArray(),
    ]);
  return {
    format: 'care-diary-export',
    version: 2,
    exportedAt: nowIso(),
    profiles,
    medications,
    intakes,
    events,
    observations,
    timeline,
    questions,
  };
}
