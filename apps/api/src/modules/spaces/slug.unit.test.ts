import { describe, expect, it } from 'vitest';

import { nextSlug, SLUG_BASE_MAX_LENGTH, slugBase } from './slug.ts';

describe('slugBase', () => {
  it.each([
    ['Focus Hub', 'focus-hub'],
    ['  Number One  Hub! ', 'number-one-hub'],
    ['Café Space', 'cafe-space'],
    ['ZM Hub 2', 'zm-hub-2'],
    ['Hub — غزة', 'hub'],
  ])('derives %j as %j', (name, slug) => {
    expect(slugBase(name)).toBe(slug);
  });

  it('yields nothing from a name without a Latin letter or digit', () => {
    expect(slugBase('مساحة')).toBeNull();
    expect(slugBase('---')).toBeNull();
  });

  it('cuts a long name to the base length, with no dash left at the end', () => {
    const base = slugBase(`${'a'.repeat(SLUG_BASE_MAX_LENGTH - 1)} hub`);

    expect(base).toBe('a'.repeat(SLUG_BASE_MAX_LENGTH - 1));
  });
});

describe('nextSlug', () => {
  it('takes the base while no space holds it', () => {
    expect(nextSlug('focus-hub', ['focus-hub-cafe'])).toBe('focus-hub');
  });

  it('adds the smallest free suffix from 2', () => {
    expect(nextSlug('focus-hub', ['focus-hub'])).toBe('focus-hub-2');
    expect(nextSlug('focus-hub', ['focus-hub', 'focus-hub-2', 'focus-hub-4'])).toBe('focus-hub-3');
  });
});
