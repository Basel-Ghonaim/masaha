import { describe, expect, it } from 'vitest';
import { CATEGORIES, ENTRIES, resolveView } from './registry';

// The category is written twice: in the layer's folder (components/<category>/<Name>) and in the
// registry entry. These tests keep the two in step. The folders are read through Vite's glob, as
// paths only; nothing is imported from inside the layer.
const COMPONENT_FOLDERS = Object.keys(
  import.meta.glob('../../shared/design-system/components/*/*/index.ts'),
).map((path) => {
  const [category = '', name = ''] = path.split('/').slice(-3, -1);
  return { category, name };
});

const ICONS_FOLDER = Object.keys(import.meta.glob('../../shared/design-system/icons/index.ts'));

// The one entry that covers more than one component: a single section shows both toggles.
const COVERED_BY: Record<string, string> = { ThemeToggle: 'Toggles', LanguageToggle: 'Toggles' };

describe('the showcase registry', () => {
  it('finds the layer’s component folders', () => {
    expect(COMPONENT_FOLDERS.length).toBeGreaterThan(0);
  });

  it('has an entry, in the same category, for every component folder', () => {
    for (const folder of COMPONENT_FOLDERS) {
      const name = COVERED_BY[folder.name] ?? folder.name;
      const found = ENTRIES.find((item) => item.name === name);
      expect(found, `no entry for ${folder.category}/${folder.name}`).toBeDefined();
      expect(found?.category, folder.name).toBe(folder.category);
    }
  });

  it('has no entry for a component that does not exist', () => {
    for (const item of ENTRIES) {
      if (item.category === 'icons') {
        expect(ICONS_FOLDER, item.name).toHaveLength(1);
        continue;
      }
      const covered = Object.keys(COVERED_BY).filter((name) => COVERED_BY[name] === item.name);
      for (const name of covered.length > 0 ? covered : [item.name]) {
        expect(
          COMPONENT_FOLDERS.some(
            (folder) => folder.category === item.category && folder.name === name,
          ),
          `${item.category}/${name}`,
        ).toBe(true);
      }
    }
  });

  it('gives every entry its own slug', () => {
    const slugs = ENTRIES.map((item) => item.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('has at least one entry in every category', () => {
    for (const category of CATEGORIES) {
      expect(
        ENTRIES.some((item) => item.category === category),
        category,
      ).toBe(true);
    }
  });
});

describe('resolveView', () => {
  it('names every section with no segments', () => {
    expect(resolveView()).toEqual({ kind: 'all', entries: ENTRIES });
  });

  it('names a category, with its entries', () => {
    const view = resolveView('fields');
    expect(view?.kind).toBe('category');
    expect(view?.entries.map((item) => item.name)).toContain('DatePicker');
    expect(view?.entries.every((item) => item.category === 'fields')).toBe(true);
  });

  it('names one entry by its category and slug', () => {
    const view = resolveView('fields', 'date-picker');
    expect(view?.kind).toBe('entry');
    expect(view?.entries.map((item) => item.name)).toEqual(['DatePicker']);
  });

  it('names nothing for an unknown category or slug, or a slug in another category', () => {
    expect(resolveView('widgets')).toBeNull();
    expect(resolveView('fields', 'nothing')).toBeNull();
    expect(resolveView('actions', 'date-picker')).toBeNull();
    expect(resolveView(undefined, 'date-picker')).toBeNull();
  });
});
