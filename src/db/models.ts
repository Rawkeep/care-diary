// Datenmodell — der Vertrag der App (siehe KONZEPT.md §6).
// Änderungen hier zuerst, dann DB-Schema/Views/Tests nachziehen.
// Alle Zeitangaben als ISO-8601-Strings (lokale Erfassung, sortierbar).

export type ID = string;

export interface Profile {
  id: ID;
  name: string;
  /** ISO-Datum, optional — für Timeline „ab Geburt" */
  birthDate?: string;
  /** Aktivierte Erkrankungs-Presets, z. B. ['epilepsy'] */
  conditions: string[];
  createdAt: string;
}

/** Eine Stufe eines ärztlich verordneten Dosisänderungs-Plans */
export interface DoseStep {
  /** gültig ab (ISO-Datum) */
  fromDate: string;
  dose: number;
  note?: string;
}

export interface Medication {
  id: ID;
  profileId: ID;
  name: string;
  substance?: string;
  /** Standard-Einzeldosis */
  dose: number;
  unit: string;
  /** Freitext-Schema, z. B. „1-0-1" */
  schedule?: string;
  /**
   * Dosisänderungs-Plan (z. B. stufenweises Herabsetzen) — dokumentiert die
   * ärztliche Verordnung. Die App rechnet keine Pläne aus, sie bildet sie ab.
   */
  doseSteps?: DoseStep[];
  /** Bedarfs-/Notfallmedikation (z. B. bei Anfällen) */
  isEmergency: boolean;
  startDate?: string;
  /** gesetzt = abgesetzt; Historie bleibt erhalten */
  endDate?: string;
  createdAt: string;
}

export type IntakeStatus = 'taken' | 'missed' | 'late' | 'vomited';

export interface Intake {
  id: ID;
  profileId: ID;
  medicationId: ID;
  at: string;
  amount: number;
  unit: string;
  status: IntakeStatus;
  note?: string;
  createdAt: string;
}

/** Generisches Ereignis (Anfall, Attacke, Schub, …) — Typen kommen aus Presets */
export interface HealthEvent {
  id: ID;
  profileId: ID;
  /** Preset-Key, z. B. 'focal_aware' oder 'other' */
  type: string;
  startedAt: string;
  durationSeconds?: number;
  /** 1 = leicht … 5 = sehr schwer */
  severity?: 1 | 2 | 3 | 4 | 5;
  /** Begleitumstände (Beobachtung, keine Kausalaussage) */
  circumstances: string[];
  emergencyMedicationGiven?: boolean;
  /** Vorboten/Aura beobachtet */
  aura?: boolean;
  /** Nachphase in Minuten (postiktal: Schlaf/Verwirrtheit) */
  postPhaseMinutes?: number;
  note?: string;
  createdAt: string;
}

/** Zustands-/Symptomwert auf Skala 1–5 (Parameter aus Preset) */
export interface Observation {
  id: ID;
  profileId: ID;
  parameter: string;
  value: 1 | 2 | 3 | 4 | 5;
  at: string;
  note?: string;
  createdAt: string;
}

/** Messwert über die Zeit (z. B. Gewicht) — u. a. für Nebenwirkungs-Beobachtung */
export type MeasurementKind = 'weight';

export interface Measurement {
  id: ID;
  profileId: ID;
  kind: MeasurementKind;
  value: number;
  unit: string;
  at: string;
  note?: string;
  createdAt: string;
}

/**
 * Beobachtete Auffälligkeit unter einem Medikament (z. B. Gewichtszunahme,
 * Verhaltensänderung). Dokumentierter Verdacht für das Arztgespräch —
 * die App stellt keine Kausalzusammenhänge fest.
 */
export interface SideEffectNote {
  id: ID;
  profileId: ID;
  medicationId: ID;
  text: string;
  at: string;
  createdAt: string;
}

export type TimelineKind = 'milestone' | 'diagnosis' | 'hospital' | 'appointment' | 'other';

export interface TimelineEntry {
  id: ID;
  profileId: ID;
  kind: TimelineKind;
  /** ISO-Datum; bei Altdaten ggf. ungefähr */
  date: string;
  approximate?: boolean;
  title: string;
  note?: string;
  createdAt: string;
}

/** Eintragsarten, an die Fotos angehängt werden können */
export type AttachmentEntryKind = 'event' | 'observation';

/** Foto-Anhang zu einem Eintrag — Binärdaten bleiben lokal in IndexedDB */
export interface Attachment {
  id: ID;
  profileId: ID;
  entryKind: AttachmentEntryKind;
  entryId: ID;
  mimeType: string;
  /** verkleinertes Bild (max. Kantenlänge, JPEG) */
  blob: Blob;
  createdAt: string;
}

/** Anhang im Export: Binärdaten als Base64 (JSON-transportabel) */
export interface ExportedAttachment {
  id: ID;
  profileId: ID;
  entryKind: AttachmentEntryKind;
  entryId: ID;
  mimeType: string;
  dataBase64: string;
  createdAt: string;
}

/**
 * Umfeld-Bericht-Variante — je Empfängerkreis eine (z. B. „Schule",
 * „Großeltern"), mit eigener Sprache und eigenen Datensparsamkeits-
 * Schaltern. Von den Angehörigen gepflegt, getrennt von medizinischen
 * Daten.
 */
/** Sprachen des Umfeld-Berichts (Struktur, Ereignisarten, Erste Hilfe) */
export type CareReportLanguage = 'de' | 'en' | 'fr' | 'tr' | 'ar' | 'uk' | 'es';

export interface CareReportVariant {
  id: ID;
  profileId: ID;
  /** Empfängerkreis, z. B. „Schule" */
  name: string;
  /** Sprache des Berichts (Struktur + Ereignisarten + Erste Hilfe) */
  language: CareReportLanguage;
  /** „Worum es geht" in eigenen Worten */
  aboutText?: string;
  /** Was im Alltag hilft */
  helpsText?: string;
  /** Was bitte vermeiden */
  avoidText?: string;
  /** Individuell mit dem Arzt vereinbartes Vorgehen */
  doctorPlanText?: string;
  /** Kontakt für Rückfragen (Eltern/Angehörige) */
  contactsText?: string;
  includeFrequency: boolean;
  includeEventTypes: boolean;
  includeTriggers: boolean;
  includeEmergencyMeds: boolean;
  updatedAt: string;
}

/** Altformat (Export v5, eine Variante je Profil) — nur noch für den Import */
export interface CareInfo {
  /** ein Datensatz je Profil */
  profileId: ID;
  /** „Worum es geht" in eigenen Worten */
  aboutText?: string;
  /** Was im Alltag hilft */
  helpsText?: string;
  /** Was bitte vermeiden */
  avoidText?: string;
  /** Individuell mit dem Arzt vereinbartes Vorgehen */
  doctorPlanText?: string;
  /** Kontakt für Rückfragen (Eltern/Angehörige) */
  contactsText?: string;
  includeFrequency: boolean;
  includeEventTypes: boolean;
  includeTriggers: boolean;
  includeEmergencyMeds: boolean;
  updatedAt: string;
}

/** Fragen-Merkliste für den nächsten Arzttermin */
export interface Question {
  id: ID;
  profileId: ID;
  text: string;
  createdAt: string;
  /** gesetzt = im Termin besprochen/erledigt */
  resolvedAt?: string;
}

/** Versioniertes Export-Format (Daten gehören den Nutzer:innen).
 *  v2 = Basis, v3 = + Foto-Anhänge (Base64), v4 = + Messwerte und
 *  Nebenwirkungs-Notizen, v5 = + Umfeld-Bericht (eine Variante),
 *  v6 = Umfeld-Bericht-Varianten je Empfänger. Import versteht alle. */
export interface ExportBundle {
  format: 'care-diary-export';
  version: 2 | 3 | 4 | 5 | 6;
  exportedAt: string;
  profiles: Profile[];
  medications: Medication[];
  intakes: Intake[];
  events: HealthEvent[];
  observations: Observation[];
  timeline: TimelineEntry[];
  questions: Question[];
  /** ab v3 */
  attachments?: ExportedAttachment[];
  /** ab v4 */
  measurements?: Measurement[];
  sideEffects?: SideEffectNote[];
  /** nur v5 (Altformat, wird beim Import konvertiert) */
  careInfo?: CareInfo[];
  /** ab v6 */
  careReports?: CareReportVariant[];
}

/** v5-Datensatz → Standard-Variante (deterministische ID ⇒ Import idempotent) */
export function careInfoToVariant(info: CareInfo): CareReportVariant {
  const { profileId, updatedAt, ...rest } = info;
  return {
    id: `${profileId}-standard`,
    profileId,
    name: 'Standard',
    language: 'de',
    updatedAt,
    ...rest,
  };
}

export function newId(): ID {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
