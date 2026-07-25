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
  /**
   * Aktivierte Begleit-Module (Keys aus `modules/registry.ts`), z. B.
   * ['prescriptions', 'stock']. Undefiniert/leer = keines aktiv: die App
   * bleibt schlank, bis ein Bedarf da ist. Deaktivieren verbirgt nur,
   * es löscht nichts.
   */
  modules?: string[];
  /**
   * Allergien & Unverträglichkeiten als Freitext-Einträge (z. B.
   * „Erdnüsse (schwer)", „Laktose"). Stammdaten — erscheinen auf der
   * Notfallkarte, im Umfeld-Bericht und im Arztbericht, nicht im Tagebuch.
   */
  allergies?: string[];
  /** Demo-Profil mit Beispieldaten — komplett löschbar über „Mehr" */
  isDemo?: boolean;
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
  /** Allergien zeigen (Standard: an — sicherheitsrelevant); optional für Altbestand */
  includeAllergies?: boolean;
  /**
   * Ernährungs-Vereinbarungen zeigen (Standard: an, sobald das Modul
   * „Ernährung" aktiv ist — Schule und Betreuung brauchen genau das).
   */
  includeNutrition?: boolean;
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

// ---------------------------------------------------------------------------
// Begleit-Module (bei Bedarf aktivierbar, siehe modules/registry.ts).
// Alles hier ist Organisation rund um die Therapie — Fristen, Nachschub,
// Termine, Vereinbarungen. Bewusst keine medizinische Bewertung.
// ---------------------------------------------------------------------------

/** Rezept-/Verordnungsart — bestimmt die Regel-Einlösefrist */
export type PrescriptionKind = 'kasse' | 'privat' | 'btm' | 'dauer' | 'hilfsmittel' | 'other';

/** Status-Kette einer Verordnung: gebraucht → angefragt → ausgestellt → eingelöst */
export type PrescriptionStatus = 'needed' | 'requested' | 'issued' | 'redeemed';

/**
 * Ärztliche Verordnung (Rezept) mit Fristenblick. Die App dokumentiert den
 * Beschaffungsweg und rechnet die Einlösefrist aus dem Ausstellungsdatum —
 * die Fristen sind Richtwerte, verbindlich ist der Beleg selbst.
 */
export interface Prescription {
  id: ID;
  profileId: ID;
  /** optionaler Bezug auf ein Medikament der Liste */
  medicationId?: ID;
  /** was verordnet wird, z. B. „Levetiracetam 500 mg, N3" */
  title: string;
  kind: PrescriptionKind;
  status: PrescriptionStatus;
  /** Praxis/Ärzt:in, bei der angefragt wird */
  prescriber?: string;
  /** Tag der Anfrage (ISO-Datum) */
  requestedDate?: string;
  /** Ausstellungsdatum (ISO-Datum) — Beginn der Einlösefrist */
  issuedDate?: string;
  /** Tag der Einlösung in der Apotheke (ISO-Datum) */
  redeemedDate?: string;
  /** abweichende Einlösefrist in Tagen, wenn auf dem Beleg anders angegeben */
  validDays?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Medikamenten-Bestand je Medikament (ein Datensatz je Medikament).
 * `units` ist eine **gezählte** Momentaufnahme; der aktuelle Stand wird aus
 * den dokumentierten Einnahmen seit `countedAt` hochgerechnet (siehe
 * `utils/stock.ts`) — die App zählt mit, statt heimlich zu buchen.
 */
export interface MedStock {
  /** Primärschlüssel: ein Bestand je Medikament */
  medicationId: ID;
  profileId: ID;
  /** gezählter Bestand in Bestands-Einheiten */
  units: number;
  /** Bezeichnung der Bestands-Einheit, z. B. „Tabletten", „ml" */
  unitLabel: string;
  /** Bestands-Einheiten je Einzeldosis (z. B. 0,5 Tablette) */
  unitsPerDose: number;
  /** Vorlauf in Tagen für Rezept + Apotheke — ab hier wird erinnert */
  leadDays: number;
  /**
   * Verfallsdatum der aktuellen Packung (ISO-Datum), optional. Besonders
   * relevant bei Notfallmedikation, die jahrelang unbenutzt bereitliegt.
   */
  expiryDate?: string;
  /** Zeitpunkt der Zählung (ISO) — ab hier werden Einnahmen abgezogen */
  countedAt: string;
  updatedAt: string;
}

/** Termin-/Untersuchungsart (EEG, Blutbild, Kontrolle …) */
export type AppointmentKind =
  | 'checkup'
  | 'eeg'
  | 'bloodwork'
  | 'druglevel'
  | 'mri'
  | 'ecg'
  | 'therapy'
  | 'dentist'
  | 'vaccination'
  | 'other';

/**
 * Arzttermin oder wiederkehrende Untersuchung. Zwei Spielarten in einem
 * Datensatz: ein **geplanter** Termin (`at` gesetzt) und/oder eine
 * **Kontrolle im Intervall** (`intervalMonths` + `lastDoneDate`). Beim
 * Abschließen entsteht — wenn ein Intervall gepflegt ist — automatisch der
 * nächste offene Datensatz, die Historie bleibt erhalten.
 */
export interface Appointment {
  id: ID;
  profileId: ID;
  kind: AppointmentKind;
  /** Ergänzung zum Typ, z. B. „Dr. Weber, Kontrolle nach Reduktion" */
  title?: string;
  /** geplanter Zeitpunkt (ISO); fehlt = nur über das Intervall geführt */
  at?: string;
  place?: string;
  /** Kontrollintervall in Monaten (z. B. Blutbild alle 3 Monate) */
  intervalMonths?: number;
  /** letzte Durchführung (ISO-Datum) — Basis der Intervall-Fälligkeit */
  lastDoneDate?: string;
  /** Vorbereitungs-Checkliste (aus Vorschlägen übernommen oder frei) */
  prep?: string[];
  /** abgehakte Punkte der Vorbereitung */
  prepDone?: string[];
  /** erledigt am (ISO-Datum) — schließt den Datensatz ab */
  doneDate?: string;
  /** Ergebnis in Kurzform, z. B. „EEG unauffällig lt. Dr. Weber" */
  resultNote?: string;
  /** Vorlauf der Erinnerung in Tagen (Standard: siehe utils/appointments.ts) */
  reminderDaysBefore?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/** Ernährungs-Haltung: was guttut, was mit Bedacht, was gemieden wird */
export type NutritionStance = 'good' | 'careful' | 'avoid';

/**
 * Ernährungs-Vereinbarung („Gos and No-Gos"). Inhalt kommt von den
 * Nutzer:innen bzw. aus dem Arztgespräch — die App empfiehlt nichts und
 * bewertet nichts, sie hält fest, was vereinbart wurde.
 */
export interface NutritionRule {
  id: ID;
  profileId: ID;
  stance: NutritionStance;
  /** Lebensmittel/Thema, z. B. „Grapefruit" */
  item: string;
  /** Begründung in eigenen Worten, z. B. „lt. Dr. Weber wegen Wirkstoffspiegel" */
  reason?: string;
  /** ärztlich bestätigt — reines Doku-Kennzeichen, kein Urteil der App */
  confirmed?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Versioniertes Export-Format (Daten gehören den Nutzer:innen).
 *  v2 = Basis, v3 = + Foto-Anhänge (Base64), v4 = + Messwerte und
 *  Nebenwirkungs-Notizen, v5 = + Umfeld-Bericht (eine Variante),
 *  v6 = Umfeld-Bericht-Varianten je Empfänger, v7 = + Begleit-Module
 *  (Verordnungen, Bestand, Termine, Ernährung). Import versteht alle. */
export interface ExportBundle {
  format: 'care-diary-export';
  version: 2 | 3 | 4 | 5 | 6 | 7;
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
  /** ab v7 — Begleit-Module */
  prescriptions?: Prescription[];
  stocks?: MedStock[];
  appointments?: Appointment[];
  nutrition?: NutritionRule[];
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
