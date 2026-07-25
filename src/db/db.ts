// IndexedDB via Dexie — lokal-first, keine Cloud, kein Egress.
// Indizes auf [profileId+Zeit] tragen Verlaufslisten und Report-Zeiträume.
import Dexie, { type Table } from 'dexie';
import type {
  Appointment,
  Attachment,
  CareInfo,
  CareReportVariant,
  ExportBundle,
  HealthEvent,
  Intake,
  Measurement,
  MedStock,
  Medication,
  NutritionRule,
  Observation,
  Prescription,
  Profile,
  Question,
  SideEffectNote,
  TimelineEntry,
} from './models';
import { careInfoToVariant, nowIso } from './models';
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
  measurements!: Table<Measurement, string>;
  sideEffects!: Table<SideEffectNote, string>;
  careReports!: Table<CareReportVariant, string>;
  prescriptions!: Table<Prescription, string>;
  /** Primärschlüssel ist die medicationId (ein Bestand je Medikament) */
  stocks!: Table<MedStock, string>;
  appointments!: Table<Appointment, string>;
  nutrition!: Table<NutritionRule, string>;

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
    // v4: Messwerte (Gewicht) + Nebenwirkungs-Notizen je Medikament
    this.version(4).stores({
      measurements: 'id, profileId, at, [profileId+at]',
      sideEffects: 'id, profileId, medicationId',
    });
    // v5: Umfeld-Bericht-Inhalte (ein Datensatz je Profil)
    this.version(5).stores({
      careInfo: 'profileId',
    });
    // v6: Umfeld-Bericht-Varianten je Empfänger; bestehende Inhalte werden
    // als Variante „Standard" übernommen
    this.version(6)
      .stores({
        careReports: 'id, profileId',
      })
      .upgrade(async (tx) => {
        const old = await tx.table<CareInfo, string>('careInfo').toArray();
        if (old.length > 0) {
          await tx.table('careReports').bulkPut(old.map(careInfoToVariant));
        }
      });
    // v7: Alt-Tabelle entfernen (erst nach der Übernahme in v6)
    this.version(7).stores({
      careInfo: null,
    });
    // v8: Begleit-Module — Verordnungen, Bestand, Termine, Ernährung.
    // Nur neue Tabellen; bestehende Profile bleiben ohne aktivierte Module
    // (Profile.modules undefiniert) und sehen davon zunächst nichts.
    this.version(8).stores({
      prescriptions: 'id, profileId, [profileId+status]',
      stocks: 'medicationId, profileId',
      appointments: 'id, profileId, at, [profileId+at]',
      nutrition: 'id, profileId, [profileId+stance]',
    });
  }
}

export const db = new CareDiaryDB();

/** Vollständiger Export aller Daten (JSON) — jederzeit, versioniert.
 *  Foto-Anhänge werden als Base64 eingebettet (v3). */
export async function buildExportBundle(): Promise<ExportBundle> {
  const [profiles, medications, intakes, events, observations, timeline, questions, attachments, measurements, sideEffects, careReports, prescriptions, stocks, appointments, nutrition] =
    await Promise.all([
      db.profiles.toArray(),
      db.medications.toArray(),
      db.intakes.toArray(),
      db.events.toArray(),
      db.observations.toArray(),
      db.timeline.toArray(),
      db.questions.toArray(),
      db.attachments.toArray(),
      db.measurements.toArray(),
      db.sideEffects.toArray(),
      db.careReports.toArray(),
      db.prescriptions.toArray(),
      db.stocks.toArray(),
      db.appointments.toArray(),
      db.nutrition.toArray(),
    ]);
  return {
    format: 'care-diary-export',
    version: 7,
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
    measurements,
    sideEffects,
    careReports,
    prescriptions,
    stocks,
    appointments,
    nutrition,
  };
}

/** Wiederherstellung eines Exports/Backups: fügt per ID ein bzw. überschreibt
 *  (idempotent — mehrfacher Import derselben Datei ändert nichts weiter).
 *  Bestehende Einträge mit anderen IDs bleiben erhalten. */
export async function importBundle(bundle: ExportBundle): Promise<void> {
  await db.transaction(
    'rw',
    [db.profiles, db.medications, db.intakes, db.events, db.observations, db.timeline, db.questions, db.attachments, db.measurements, db.sideEffects, db.careReports, db.prescriptions, db.stocks, db.appointments, db.nutrition],
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
      if (bundle.measurements) await db.measurements.bulkPut(bundle.measurements);
      if (bundle.sideEffects) await db.sideEffects.bulkPut(bundle.sideEffects);
      // v5-Altformat: eine Variante je Profil → „Standard" (deterministische ID)
      if (bundle.careInfo) await db.careReports.bulkPut(bundle.careInfo.map(careInfoToVariant));
      if (bundle.careReports) await db.careReports.bulkPut(bundle.careReports);
      // ab v7: Begleit-Module
      if (bundle.prescriptions) await db.prescriptions.bulkPut(bundle.prescriptions);
      if (bundle.stocks) await db.stocks.bulkPut(bundle.stocks);
      if (bundle.appointments) await db.appointments.bulkPut(bundle.appointments);
      if (bundle.nutrition) await db.nutrition.bulkPut(bundle.nutrition);
    }
  );
}
