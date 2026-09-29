import { describe, expect, it } from 'vitest';
import { setupLocalisation } from '@shared/localisation';
import { CATALOGUES, currentCopy } from './catalogues';
import type { Catalogue, Lines } from './shape';

const english = CATALOGUES.en;

/** Every line of a catalogue, as its key path and whether it is words or a function of values. */
function linesOf(value: unknown, path = ''): string[] {
  if (typeof value === 'string' || typeof value === 'function') {
    return [`${path}: ${typeof value}`];
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      linesOf(child, path ? `${path}.${key}` : key),
    );
  }
  return [`${path}: ${typeof value}`];
}

/** Every string a catalogue writes directly (a function's words are its caller's to check). */
function wordsOf(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value).flatMap(wordsOf);
  }
  return [];
}

describe('the catalogues', () => {
  it.each(Object.entries(CATALOGUES))(
    '%s has exactly the lines English has, each of the same kind',
    (_, catalogue) => {
      expect(linesOf(catalogue).sort()).toEqual(linesOf(english).sort());
    },
  );

  it.each(Object.entries(CATALOGUES))('%s writes no empty line', (_, catalogue) => {
    expect(wordsOf(catalogue).filter((words) => words.trim() === '')).toEqual([]);
  });

  it("a catalogue that drifts from English's shape does not compile", () => {
    // The typecheck lane is the proof: each directive fails it unless its line errs. Each fixture is
    // used below, so an unused-variable error cannot stand in for the one it names.
    // @ts-expect-error lines are missing
    const missing: Catalogue = { ...english, terms: { space: english.terms.space } };
    // @ts-expect-error a line English does not have
    const extra: Catalogue = { ...english, footer: 'Made with care' };
    // A line that takes values is handed the same ones in every language.
    type Counted = Lines<{ seatsLeft: (count: number) => string }>;
    // @ts-expect-error a line takes different values
    const reshaped: Counted = { seatsLeft: (count: string) => count };

    expect([missing, extra, reshaped]).toHaveLength(3);
  });

  it("gives code that is not a component the active language's words", () => {
    let language = 'en';
    setupLocalisation({
      catalogues: CATALOGUES,
      language: { current: () => language, subscribe: () => () => undefined },
    });

    expect(currentCopy().terms.space).toBe('Space');

    language = 'ar';

    expect(currentCopy().terms.space).toBe('مساحة');
  });
});
