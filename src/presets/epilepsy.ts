// Epilepsie-Preset (Leuchtturm-Anwendungsfall, KONZEPT.md §4).
// Anfallsarten laienverständlich beschrieben, gemappt auf die ILAE-Klassifikation.
// Ein Preset = Ereignistypen + Begleitumstände + Zustands-Parameter.
// Weitere Erkrankungen folgen demselben Muster (ein Datenmodell, viele Presets).

export interface EventTypeDef {
  key: string;
  label: string;
  /** Klartext-Beschreibung als Auswahlhilfe für Laien */
  description: string;
}

export interface ObservationParamDef {
  key: string;
  label: string;
  /** Bedeutung der Skalen-Enden: [1, 5] */
  scaleHint: [string, string];
}

export interface ConditionPreset {
  key: string;
  label: string;
  eventTypes: EventTypeDef[];
  circumstances: string[];
  observationParams: ObservationParamDef[];
  /**
   * Allgemeine Erste-Hilfe-Grundregeln in Laiensprache (für den
   * Umfeld-Bericht). Individuelle ärztliche Anweisungen gehen immer vor.
   */
  firstAid: string[];
}

export const EPILEPSY_PRESET: ConditionPreset = {
  key: 'epilepsy',
  label: 'Epilepsie / Anfallsleiden',
  eventTypes: [
    {
      key: 'focal_aware',
      label: 'Fokal, bewusst',
      description: 'Bei vollem Bewusstsein; z. B. Zuckungen, Kribbeln, komisches Gefühl in einem Körperteil.',
    },
    {
      key: 'focal_impaired',
      label: 'Fokal, Bewusstsein beeinträchtigt',
      description: 'Abwesend/nicht ansprechbar, oft Automatismen (Nesteln, Schmatzen), danach verwirrt.',
    },
    {
      key: 'tonic_clonic',
      label: 'Tonisch-klonisch („großer Anfall")',
      description: 'Versteifung des Körpers, dann rhythmische Zuckungen; Bewusstlosigkeit.',
    },
    {
      key: 'absence',
      label: 'Absence',
      description: 'Kurze Abwesenheit (Sekunden), starrer Blick, unterbricht Tätigkeit, danach sofort wieder da.',
    },
    {
      key: 'myoclonic',
      label: 'Myoklonisch',
      description: 'Einzelne, blitzartige Muskelzuckungen (z. B. Arme), meist bei Bewusstsein.',
    },
    {
      key: 'atonic',
      label: 'Atonisch (Sturzanfall)',
      description: 'Plötzlicher Verlust der Muskelspannung, Zusammensacken oder Sturz.',
    },
    {
      key: 'unclassified',
      label: 'Unklar / nicht zuordenbar',
      description: 'Auffälliges Ereignis, das zu keiner Beschreibung passt — trotzdem dokumentieren!',
    },
  ],
  circumstances: [
    'Schlafmangel',
    'Fieber / Infekt',
    'Stress / Aufregung',
    'Einnahme vergessen',
    'Flackerlicht / Bildschirm',
    'Menstruation / Zyklus',
    'Aus dem Schlaf heraus',
    'Unbekannt',
  ],
  observationParams: [
    { key: 'energy', label: 'Energie', scaleHint: ['sehr erschöpft', 'voller Energie'] },
    { key: 'mood', label: 'Stimmung', scaleHint: ['sehr schlecht', 'sehr gut'] },
    { key: 'sleep', label: 'Schlaf (letzte Nacht)', scaleHint: ['sehr schlecht', 'sehr gut'] },
    { key: 'appetite', label: 'Appetit', scaleHint: ['kein Appetit', 'normal/gut'] },
    { key: 'behavior', label: 'Verhalten', scaleHint: ['sehr auffällig', 'unauffällig'] },
    { key: 'speech', label: 'Aussprache / Sprache', scaleHint: ['sehr undeutlich', 'klar wie sonst'] },
  ],
  firstAid: [
    'Ruhe bewahren — die meisten Anfälle hören von selbst wieder auf.',
    'Auf die Uhr schauen und die Dauer merken.',
    'Gefährliche Gegenstände wegräumen, Kopf weich lagern (z. B. Jacke).',
    'Nicht festhalten und nichts in den Mund stecken.',
    'Nach dem Anfall in die stabile Seitenlage bringen und dableiben, bis die Person wieder ganz da ist.',
    'Notruf 112: wenn der Anfall länger als 5 Minuten dauert, direkt ein weiterer folgt, eine Verletzung passiert ist oder es der erste Anfall überhaupt ist.',
    'Danach den Eltern/Angehörigen kurz Bescheid geben — Uhrzeit und Dauer helfen sehr.',
  ],
};

/** Migräne-Preset — zweiter Anwendungsfall nach demselben Muster */
export const MIGRAINE_PRESET: ConditionPreset = {
  key: 'migraine',
  label: 'Migräne / Kopfschmerz',
  eventTypes: [
    {
      key: 'migraine_aura',
      label: 'Migräne mit Aura',
      description: 'Vorboten wie Flimmern, Lichtblitze, Kribbeln oder Sprachstörung, dann Kopfschmerz.',
    },
    {
      key: 'migraine_no_aura',
      label: 'Migräne ohne Aura',
      description: 'Meist einseitig pochender Kopfschmerz, oft mit Übelkeit, Licht-/Lärmempfindlichkeit.',
    },
    {
      key: 'tension',
      label: 'Spannungskopfschmerz',
      description: 'Dumpf-drückend, beidseitig („wie ein Band um den Kopf"), meist ohne Übelkeit.',
    },
    {
      key: 'cluster',
      label: 'Cluster-artig',
      description: 'Sehr starker, einseitiger Schmerz um Auge/Schläfe, oft mit tränendem Auge.',
    },
    {
      key: 'unclassified',
      label: 'Unklar / nicht zuordenbar',
      description: 'Auffällige Kopfschmerz-Episode, die zu keiner Beschreibung passt — trotzdem dokumentieren!',
    },
  ],
  circumstances: [
    'Schlafmangel',
    'Stress / Aufregung',
    'Wetterwechsel',
    'Menstruation / Zyklus',
    'Mahlzeit ausgelassen',
    'Bildschirm / Flackerlicht',
    'Lärm / Gerüche',
    'Bestimmte Lebensmittel (z. B. Rotwein, Käse)',
    'Unbekannt',
  ],
  observationParams: [
    { key: 'pain', label: 'Schmerzen', scaleHint: ['sehr stark', 'keine'] },
    { key: 'energy', label: 'Energie', scaleHint: ['sehr erschöpft', 'voller Energie'] },
    { key: 'mood', label: 'Stimmung', scaleHint: ['sehr schlecht', 'sehr gut'] },
    { key: 'sleep', label: 'Schlaf (letzte Nacht)', scaleHint: ['sehr schlecht', 'sehr gut'] },
    { key: 'concentration', label: 'Konzentration', scaleHint: ['sehr schwer', 'wie sonst'] },
  ],
  firstAid: [
    'Einen ruhigen, abgedunkelten Ort ermöglichen — Licht und Lärm verschlimmern oft.',
    'Wasser anbieten; wenn vereinbart, das Medikament laut Plan.',
    'Nicht drängen („reiß dich zusammen" hilft nicht — es ist keine Frage des Willens).',
    'Zeit geben: Rückzug ist keine Unhöflichkeit, sondern Selbstschutz.',
    'Bei ungewohnt heftigen oder ganz neuen Symptomen die Angehörigen informieren.',
  ],
};

/** Generisches Fallback-Preset für Profile ohne aktivierte Erkrankung */
export const GENERIC_PRESET: ConditionPreset = {
  key: 'generic',
  label: 'Allgemein',
  eventTypes: [
    { key: 'episode', label: 'Episode / Schub', description: 'Akute Verschlechterung oder Attacke.' },
    { key: 'anomaly', label: 'Auffälligkeit', description: 'Etwas war anders als sonst — beobachten und festhalten.' },
  ],
  circumstances: ['Stress', 'Infekt', 'Einnahme vergessen', 'Wetter', 'Unbekannt'],
  observationParams: [
    { key: 'energy', label: 'Energie', scaleHint: ['sehr erschöpft', 'voller Energie'] },
    { key: 'mood', label: 'Stimmung', scaleHint: ['sehr schlecht', 'sehr gut'] },
    { key: 'sleep', label: 'Schlaf (letzte Nacht)', scaleHint: ['sehr schlecht', 'sehr gut'] },
    { key: 'pain', label: 'Schmerzen', scaleHint: ['keine', 'sehr stark'] },
  ],
  firstAid: [
    'Ruhe bewahren und bei der Person bleiben.',
    'Nichts erzwingen — Zeit und ein ruhiger Ort helfen meist am ehesten.',
    'Bei Unsicherheit oder ungewohnt heftigen Symptomen die Angehörigen informieren.',
  ],
};

const PRESETS: Record<string, ConditionPreset> = {
  [EPILEPSY_PRESET.key]: EPILEPSY_PRESET,
  [MIGRAINE_PRESET.key]: MIGRAINE_PRESET,
  [GENERIC_PRESET.key]: GENERIC_PRESET,
};

/** Auswählbare Erkrankungs-Module fürs Profil-Setup */
export const SELECTABLE_PRESETS: ConditionPreset[] = [
  EPILEPSY_PRESET,
  MIGRAINE_PRESET,
  GENERIC_PRESET,
];

/** Liefert das Preset zum ersten aktivierten Condition-Key, sonst das generische. */
export function presetFor(conditions: string[]): ConditionPreset {
  for (const key of conditions) {
    const p = PRESETS[key];
    if (p) return p;
  }
  return GENERIC_PRESET;
}

export function eventTypeLabel(preset: ConditionPreset, key: string): string {
  return preset.eventTypes.find((t) => t.key === key)?.label ?? key;
}
