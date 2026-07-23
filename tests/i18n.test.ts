// Tests für die Sprachpakete des Umfeld-Berichts: Vollständigkeit der
// Übersetzungen (Ereignisarten, Erste Hilfe, Kartenschritte) je Preset.
import { describe, expect, it } from 'vitest';
import { careInfoToVariant } from '../src/db/models';
import {
  CARD_STEPS,
  fill,
  PRESET_TRANSLATIONS,
  presetContent,
  REPORT_STRINGS,
} from '../src/i18n/careReport';
import { EPILEPSY_PRESET, GENERIC_PRESET, MIGRAINE_PRESET } from '../src/presets/epilepsy';

const PRESETS = [EPILEPSY_PRESET, MIGRAINE_PRESET, GENERIC_PRESET];
const LANGS = ['en', 'fr', 'tr', 'ar', 'uk', 'es'] as const;

describe('Preset-Übersetzungen', () => {
  it('decken jede Ereignisart und jeden Erste-Hilfe-Schritt ab (en/fr)', () => {
    for (const lang of LANGS) {
      for (const preset of PRESETS) {
        const t = PRESET_TRANSLATIONS[lang][preset.key];
        expect(t, `${lang}/${preset.key}`).toBeDefined();
        expect(Object.keys(t.eventTypes).sort()).toEqual(
          preset.eventTypes.map((e) => e.key).sort()
        );
        expect(t.firstAid.length).toBe(preset.firstAid.length);
        expect(t.conditionLabel.length).toBeGreaterThan(0);
      }
    }
  });

  it('presetContent: de = Original, en/fr = Übersetzung', () => {
    const de = presetContent(EPILEPSY_PRESET, 'de');
    expect(de.eventTypes.absence.label).toBe('Absence');
    expect(de.firstAid).toEqual(EPILEPSY_PRESET.firstAid);
    const en = presetContent(EPILEPSY_PRESET, 'en');
    expect(en.eventTypes.tonic_clonic.label).toContain('Tonic-clonic');
  });

  it('Notfallkarten-Schritte existieren für jede Sprache und jedes Preset', () => {
    for (const lang of ['de', ...LANGS] as const) {
      for (const preset of PRESETS) {
        const steps = CARD_STEPS[lang][preset.key];
        expect(steps, `${lang}/${preset.key}`).toBeDefined();
        expect(steps.length).toBeGreaterThan(0);
        expect(steps.length).toBeLessThanOrEqual(4); // Karte bleibt lesbar
      }
    }
  });

  it('Berichts-Strings sind in allen Sprachen vollständig', () => {
    const deKeys = Object.keys(REPORT_STRINGS.de).sort();
    for (const lang of LANGS) {
      expect(Object.keys(REPORT_STRINGS[lang]).sort(), lang).toEqual(deKeys);
    }
  });

  it('fill ersetzt Platzhalter', () => {
    expect(fill('Hallo {name}, {n} Tage', { name: 'Mia', n: 3 })).toBe('Hallo Mia, 3 Tage');
  });
});

describe('careInfoToVariant (v5-Import)', () => {
  it('erzeugt deterministische ID (Import bleibt idempotent) und Standard-Werte', () => {
    const v = careInfoToVariant({
      profileId: 'p1',
      aboutText: 'x',
      includeFrequency: true,
      includeEventTypes: true,
      includeTriggers: false,
      includeEmergencyMeds: true,
      updatedAt: '2026-07-23T00:00:00.000Z',
    });
    expect(v.id).toBe('p1-standard');
    expect(v.name).toBe('Standard');
    expect(v.language).toBe('de');
    expect(v.aboutText).toBe('x');
    expect(v.includeFrequency).toBe(true);
  });
});
