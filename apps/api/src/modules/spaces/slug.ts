// A space's public URL is its slug (docs/architecture/data-model.md › Conventions): derived from its
// English name when it is created, unique, never changed and never reused, a soft-deleted space's
// included.

/** The longest base a slug starts from, before any numeric suffix. */
export const SLUG_BASE_MAX_LENGTH = 60;

/**
 * The slug an English name yields: accents dropped, lowercased, and every run of other characters
 * than `a–z` and `0–9` one `-`, with none at either end ("Focus Hub" → `focus-hub`). Null when the
 * name holds no Latin letter or digit.
 */
export function slugBase(nameEn: string): string | null {
  const base = nameEn
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, SLUG_BASE_MAX_LENGTH)
    .replace(/^-+|-+$/g, '');
  return base === '' ? null : base;
}

/**
 * The first free slug from `base`: the base itself, else the base with the smallest suffix from 2
 * (`focus-hub-2`) that no space holds. `taken` holds every slug already used, a deleted space's too.
 */
export function nextSlug(base: string, taken: readonly string[]): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${String(suffix)}`)) suffix += 1;
  return `${base}-${String(suffix)}`;
}
