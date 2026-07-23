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

/** Fragen-Merkliste für den nächsten Arzttermin */
export interface Question {
  id: ID;
  profileId: ID;
  text: string;
  createdAt: string;
  /** gesetzt = im Termin besprochen/erledigt */
  resolvedAt?: string;
}

/** Versioniertes Export-Format (Daten gehören den Nutzer:innen) */
export interface ExportBundle {
  format: 'care-diary-export';
  version: 2;
  exportedAt: string;
  profiles: Profile[];
  medications: Medication[];
  intakes: Intake[];
  events: HealthEvent[];
  observations: Observation[];
  timeline: TimelineEntry[];
  questions: Question[];
}

export function newId(): ID {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
