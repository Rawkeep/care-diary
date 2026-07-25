// Ernährung: Gutes & Meiden („Gos and No-Gos") — eine Gedächtnisstütze für
// den Alltag und fürs Umfeld (Schule, Betreuung, Großeltern).
//
// WICHTIG, und das ist die Grenze dieses Moduls: die App gibt **keine**
// Ernährungsempfehlung ab. Sie hält fest, was mit der Ärztin/dem Arzt
// vereinbart oder in der Familie beobachtet wurde. Die Vorschläge unten sind
// **Gesprächsanstöße für den nächsten Termin**, formuliert als Frage —
// nicht als Anweisung, und ausdrücklich ohne Wirkungsbehauptung.
import type { NutritionRule, NutritionStance } from '../db/models';

export interface StanceDef {
  key: NutritionStance;
  label: string;
  /** kurzer Zusatz für Überschriften/Legenden */
  short: string;
  icon: string;
}

export const STANCES: StanceDef[] = [
  { key: 'good', label: 'Tut gut', short: 'Gutes', icon: '✅' },
  { key: 'careful', label: 'Mit Bedacht', short: 'Bedacht', icon: '⚠️' },
  { key: 'avoid', label: 'Bitte meiden', short: 'Meiden', icon: '⛔' },
];

const STANCE_BY_KEY: Record<string, StanceDef> = Object.fromEntries(STANCES.map((s) => [s.key, s]));

export function stanceDef(stance: NutritionStance): StanceDef {
  return STANCE_BY_KEY[stance] ?? STANCE_BY_KEY.careful;
}

export function stanceLabel(stance: NutritionStance): string {
  return stanceDef(stance).label;
}

export interface NutritionSuggestion {
  stance: NutritionStance;
  item: string;
  /** als Frage formuliert — wird beim Übernehmen zur Notiz */
  reason: string;
}

/**
 * Gesprächsanstöße zum Übernehmen. Bewusst neutral und fragend: die Liste
 * sagt nicht, was gilt — sie erinnert daran, was man einmal geklärt haben
 * sollte. Nach dem Übernehmen ist der Text frei überschreibbar, und ein
 * Häkchen „ärztlich bestätigt" macht sichtbar, was besprochen wurde.
 */
export const NUTRITION_SUGGESTIONS: NutritionSuggestion[] = [
  {
    stance: 'good',
    item: 'Regelmäßige Mahlzeiten',
    reason: 'Beim Termin klären: Sollen Mahlzeiten möglichst nicht ausgelassen werden?',
  },
  {
    stance: 'good',
    item: 'Ausreichend trinken',
    reason: 'Beim Termin klären: Gibt es eine Empfehlung zur Trinkmenge?',
  },
  {
    stance: 'good',
    item: 'Feste Zeiten für die Einnahme (z. B. zum Essen)',
    reason: 'Beim Termin klären: vor, zu oder nach dem Essen einnehmen?',
  },
  {
    stance: 'careful',
    item: 'Grapefruit / Pampelmuse',
    reason: 'Beim Termin oder in der Apotheke klären, ob das mit der Medikation zusammenpasst.',
  },
  {
    stance: 'careful',
    item: 'Milchprodukte direkt zur Einnahme',
    reason: 'In der Apotheke klären, ob ein Zeitabstand zur Einnahme nötig ist.',
  },
  {
    stance: 'careful',
    item: 'Koffein (Kaffee, Cola, Energydrinks)',
    reason: 'Beim Termin klären, was in welcher Menge okay ist.',
  },
  {
    stance: 'careful',
    item: 'Alkohol',
    reason: 'Beim Termin klären — besonders im Zusammenspiel mit der Medikation.',
  },
  {
    stance: 'careful',
    item: 'Nahrungsergänzung & pflanzliche Präparate',
    reason: 'Vor der Einnahme ärztlich abklären (auch „harmlose" Präparate können wechselwirken).',
  },
  {
    stance: 'avoid',
    item: 'Bekannte Allergene',
    reason: 'Aus dem Profil übernehmen und im Umfeld-Bericht sichtbar machen.',
  },
];

/** Vorschläge, die noch nicht in der Liste stehen (Vergleich ohne Groß/Klein) */
export function unusedSuggestions(rules: NutritionRule[]): NutritionSuggestion[] {
  const have = new Set(rules.map((r) => r.item.trim().toLowerCase()));
  return NUTRITION_SUGGESTIONS.filter((s) => !have.has(s.item.toLowerCase()));
}

/** Nach Haltung gruppiert, innerhalb alphabetisch (deutsche Sortierung) */
export function groupByStance(rules: NutritionRule[]): Record<NutritionStance, NutritionRule[]> {
  const out: Record<NutritionStance, NutritionRule[]> = { good: [], careful: [], avoid: [] };
  for (const r of rules) {
    if (out[r.stance]) out[r.stance].push(r);
  }
  for (const key of Object.keys(out) as NutritionStance[]) {
    out[key].sort((a, b) => a.item.localeCompare(b.item, 'de'));
  }
  return out;
}

/** Kurzfassung fürs Umfeld: „⛔ Erdnüsse · ⚠️ Grapefruit" (Meiden zuerst) */
export function nutritionSummary(rules: NutritionRule[]): string {
  const grouped = groupByStance(rules);
  return [...grouped.avoid, ...grouped.careful]
    .map((r) => `${stanceDef(r.stance).icon} ${r.item}`)
    .join(' · ');
}
