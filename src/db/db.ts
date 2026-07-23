// IndexedDB via Dexie — lokal-first, keine Cloud, kein Egress.
// Indizes auf [profileId+Zeit] tragen Verlaufslisten und Report-Zeiträume.
import Dexie, { type Table } from 'dexie';
import type {
  Attachment,
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
import { base64ToBlob, blobToBase64 } from '../utils/base64';

export class CareDiaryDB extends Dexie {
  profiles!: Table<Profile, string>;
  medications!: Table<Medication, string>;
  intakes!: Table<Intake, string>;
  events!: Table<HealthEvent, string>;
  observations!: Table<Observation, string>;
  timeline!: Table<TimelineEntry, string>;
  questions!: Table<Question, string>;
  attachments!: Table<Attachment, string>;

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
    // v3: Foto-Anhänge zu Ereignissen/Zustandseinträgen (Blob bleibt lokal)
    this.version(3).stores({
      attachments: 'id, profileId, entryId',
    });
  }
}

export const db = new CareDiaryDB();

/** Vollständiger Export aller Daten (JSON) — jederzeit, versioniert.
 *  Foto-Anhänge werden als Base64 eingebettet (v3). */
export async function buildExportBundle(): Promise<ExportBundle> {
  const [profiles, medications, intakes, events, observations, timeline, questions, attachments] =
    await Promise.all([
      db.profiles.toArray(),
      db.medications.toArray(),
      db.intakes.toArray(),
      db.events.toArray(),
      db.observations.toArray(),
      db.timeline.toArray(),
      db.questions.toArray(),
      db.attachments.toArray(),
    ]);
  return {
    format: 'care-diary-export',
    version: 3,
    exportedAt: nowIso(),
    profiles,
    medications,
    intakes,
    events,
    observations,
    timeline,
    questions,
    attachments: await Promise.all(
      attachments.map(async ({ blob, ...meta }) => ({
        ...meta,
        dataBase64: await blobToBase64(blob),
      }))
    ),
  };
}

/** Wiederherstellung eines Exports/Backups: fügt per ID ein bzw. überschreibt
 *  (idempotent — mehrfacher Import derselben Datei ändert nichts weiter).
 *  Bestehende Einträge mit anderen IDs bleiben erhalten. */
export async function importBundle(bundle: ExportBundle): Promise<void> {
  await db.transaction(
    'rw',
    [db.profiles, db.medications, db.intakes, db.events, db.observations, db.timeline, db.questions, db.attachments],
    async () => {
      await db.profiles.bulkPut(bundle.profiles);
      await db.medications.bulkPut(bundle.medications);
      await db.intakes.bulkPut(bundle.intakes);
      await db.events.bulkPut(bundle.events);
      await db.observations.bulkPut(bundle.observations);
      await db.timeline.bulkPut(bundle.timeline);
      await db.questions.bulkPut(bundle.questions);
      if (bundle.attachments) {
        await db.attachments.bulkPut(
          bundle.attachments.map(({ dataBase64, ...meta }) => ({
            ...meta,
            blob: base64ToBlob(dataBase64, meta.mimeType),
          }))
        );
      }
    }
  );
}
