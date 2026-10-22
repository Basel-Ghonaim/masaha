import type { FactGroup } from '@masaha/shared/spaces';
import type { Catalogue, Language } from '@shared/copy';
import { updatedAgo } from '@shared/lib';

type Words = Pick<Catalogue['directory']['page'], 'updated' | 'stale'>;

/**
 * A fact group's freshness as its section says it (U4): when it was last updated, and «قد يكون
 * تغيّر» when the server counts it stale. A group never saved says neither.
 */
export function freshnessOf(
  updatedAt: string | null,
  stale: boolean,
  group: FactGroup,
  now: Date,
  language: Language,
  words: Words,
): { line: string | null; stale: string | null } {
  if (updatedAt === null) return { line: null, stale: null };
  return {
    line: words.updated[group]({ ago: updatedAgo(updatedAt, language, now) }),
    stale: stale ? words.stale : null,
  };
}
