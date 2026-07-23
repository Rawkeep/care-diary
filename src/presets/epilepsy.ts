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
};

const PRESETS: Record<string, ConditionPreset> = {
  [EPILEPSY_PRESET.key]: EPILEPSY_PRESET,
  [GENERIC_PRESET.key]: GENERIC_PRESET,
};

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
