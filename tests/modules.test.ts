// Tests für die Modul-Registry (Aktivieren „bei Bedarf") und die
// Ernährungs-Gruppierung.
import { describe, expect, it } from 'vitest';
import type { NutritionRule } from '../src/db/models';
import {
  MODULES,
  enabledModules,
  moduleEnabled,
  moduleLabel,
  moduleOrder,
  toggleModule,
} from '../src/modules/registry';
import {
  NUTRITION_SUGGESTIONS,
  groupByStance,
  nutritionSummary,
  stanceLabel,
  unusedSuggestions,
} from '../src/utils/nutrition';

describe('Modul-Registry', () => {
  it('kein Modul ist standardmäßig aktiv (die App bleibt schlank)', () => {
    expect(enabledModules(undefined)).toEqual([]);
    expect(moduleEnabled(undefined, 'stock')).toBe(false);
    expect(moduleEnabled([], 'stock')).toBe(false);
  });

  it('aktivieren, deaktivieren, doppelt aktivieren ändert nichts', () => {
    let m = toggleModule(undefined, 'stock', true);
    expect(m).toEqual(['stock']);
    m = toggleModule(m, 'stock', true);
    expect(m).toEqual(['stock']);
    m = toggleModule(m, 'appointments', true);
    expect(m).toEqual(['stock', 'appointments']);
    m = toggleModule(m, 'stock', false);
    expect(m).toEqual(['appointments']);
    expect(toggleModule(m, 'nutrition', false)).toEqual(['appointments']);
  });

  it('aktivierte Module kommen in Registry-Reihenfolge, unbekannte Keys fliegen raus', () => {
    const keys = enabledModules(['nutrition', 'gibtesnicht', 'prescriptions']).map((m) => m.key);
    expect(keys).toEqual(['prescriptions', 'nutrition']);
    expect(moduleOrder('prescriptions')).toBeLessThan(moduleOrder('nutrition'));
    expect(moduleOrder('gibtesnicht')).toBe(MODULES.length);
  });

  it('jedes Modul hat Label, Beschreibung und Erinnerungs-Versprechen', () => {
    for (const m of MODULES) {
      expect(m.label.length).toBeGreaterThan(3);
      expect(m.description.length).toBeGreaterThan(20);
      expect(m.reminds.length).toBeGreaterThan(10);
      expect(moduleLabel(m.key)).toBe(m.label);
    }
    expect(moduleLabel('gibtesnicht')).toBe('gibtesnicht');
  });
});

describe('Ernährung', () => {
  const rule = (over: Partial<NutritionRule> = {}): NutritionRule => ({
    id: 'n1',
    profileId: 'p1',
    stance: 'avoid',
    item: 'Erdnüsse',
    createdAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-01T10:00:00.000Z',
    ...over,
  });

  it('gruppiert nach Haltung, alphabetisch innerhalb der Gruppe', () => {
    const grouped = groupByStance([
      rule({ id: 'a', stance: 'careful', item: 'Zitrone' }),
      rule({ id: 'b', stance: 'careful', item: 'Grapefruit' }),
      rule({ id: 'c', stance: 'good', item: 'Wasser' }),
    ]);
    expect(grouped.careful.map((r) => r.item)).toEqual(['Grapefruit', 'Zitrone']);
    expect(grouped.good.map((r) => r.item)).toEqual(['Wasser']);
    expect(grouped.avoid).toEqual([]);
  });

  it('Kurzfassung fürs Umfeld: Meiden vor Bedacht, Gutes bleibt draußen', () => {
    const s = nutritionSummary([
      rule({ id: 'a', stance: 'careful', item: 'Grapefruit' }),
      rule({ id: 'b', stance: 'avoid', item: 'Erdnüsse' }),
      rule({ id: 'c', stance: 'good', item: 'Wasser' }),
    ]);
    expect(s).toBe('⛔ Erdnüsse · ⚠️ Grapefruit');
    expect(nutritionSummary([])).toBe('');
  });

  it('Vorschläge: bereits übernommene verschwinden (ohne Groß/Klein-Zicken)', () => {
    const alle = unusedSuggestions([]);
    expect(alle.length).toBe(NUTRITION_SUGGESTIONS.length);
    const rest = unusedSuggestions([rule({ item: '  grapefruit / pampelmuse ' })]);
    expect(rest.some((s) => s.item === 'Grapefruit / Pampelmuse')).toBe(false);
    expect(rest.length).toBe(NUTRITION_SUGGESTIONS.length - 1);
  });

  it('Vorschläge sind Gesprächsanstöße, keine Empfehlung der App', () => {
    for (const s of NUTRITION_SUGGESTIONS) {
      expect(s.reason).toMatch(/klären|abklären|übernehmen/);
    }
    expect(stanceLabel('avoid')).toBe('Bitte meiden');
  });
});
