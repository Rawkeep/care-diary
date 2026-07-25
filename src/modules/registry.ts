// Begleit-Module — die Aktivitäten *rund um* die Therapie: Verordnungen
// besorgen, Nachschub im Blick behalten, Untersuchungstermine führen,
// Ernährungs-Vereinbarungen festhalten.
//
// Leitgedanke: die App bleibt schlank, bis ein Bedarf da ist. Jedes Modul
// wird einzeln aktiviert (Profil → `modules`), erscheint erst dann in der
// Navigation und in den Berichten. Deaktivieren verbirgt nur — Daten bleiben.
//
// Ein Modul = Registry-Eintrag + eigene Tabelle + deterministische Logik in
// `utils/` + Panel in der Plan-Ansicht. Weitere folgen demselben Muster.

export type ModuleKey = 'prescriptions' | 'stock' | 'appointments' | 'nutrition';

export interface ModuleDef {
  key: ModuleKey;
  /** Name in der Navigation/Überschrift */
  label: string;
  /** ein Satz: was das Modul übernimmt */
  description: string;
  /** was die App dabei proaktiv meldet (Erwartungsmanagement) */
  reminds: string;
}

export const MODULES: ModuleDef[] = [
  {
    key: 'prescriptions',
    label: 'Verordnungen & Fristen',
    description:
      'Rezepte anfordern, den Weg von „gebraucht" bis „eingelöst" festhalten und die Einlösefrist im Blick behalten.',
    reminds: 'Erinnert an offene Anfragen, ans Nachfragen und an ablaufende Rezept-Fristen.',
  },
  {
    key: 'stock',
    label: 'Medikamenten-Bestand',
    description:
      'Bestand zählen, Reichweite aus dem Einnahme-Rhythmus hochrechnen und rechtzeitig für Nachschub sorgen.',
    reminds: 'Meldet sich, wenn der Vorrat mit Vorlaufzeit zur Neige geht — nicht erst, wenn die Dose leer ist.',
  },
  {
    key: 'appointments',
    label: 'Termine & Untersuchungen',
    description:
      'Arzttermine und wiederkehrende Kontrollen (EEG, Blutbild, Medikamentenspiegel …) mit Vorbereitungs-Checkliste.',
    reminds: 'Erinnert vor dem Termin (inkl. Vorbereitung) und wenn eine Kontrolle laut Intervall fällig ist.',
  },
  {
    key: 'nutrition',
    label: 'Ernährung: Gutes & Meiden',
    description:
      'Was guttut, was mit Bedacht, was gemieden wird — als Gedächtnisstütze für den Alltag und fürs Umfeld.',
    reminds: 'Erinnert nicht, sondern steht bereit: im Alltag, im Arztbericht und im Umfeld-Bericht.',
  },
];

const BY_KEY: Record<string, ModuleDef> = Object.fromEntries(MODULES.map((m) => [m.key, m]));

export function moduleDef(key: string): ModuleDef | undefined {
  return BY_KEY[key];
}

export function moduleLabel(key: string): string {
  return BY_KEY[key]?.label ?? key;
}

/** Reihenfolge wie in MODULES — bestimmt Panel- und Sortier-Reihenfolge */
export function moduleOrder(key: string): number {
  const i = MODULES.findIndex((m) => m.key === key);
  return i < 0 ? MODULES.length : i;
}

/** Ist das Modul für dieses Profil aktiviert? (undefiniert = keines aktiv) */
export function moduleEnabled(modules: string[] | undefined, key: ModuleKey): boolean {
  return (modules ?? []).includes(key);
}

/** Aktivierte Module in Registry-Reihenfolge (unbekannte Keys werden ignoriert) */
export function enabledModules(modules: string[] | undefined): ModuleDef[] {
  return MODULES.filter((m) => (modules ?? []).includes(m.key));
}

/** Modul-Liste mit einem Modul mehr bzw. weniger (Reihenfolge stabil) */
export function toggleModule(modules: string[] | undefined, key: ModuleKey, on: boolean): string[] {
  const current = modules ?? [];
  if (on) return current.includes(key) ? current : [...current, key];
  return current.filter((k) => k !== key);
}
