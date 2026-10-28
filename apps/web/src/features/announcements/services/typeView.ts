import type { AnnouncementType } from '@masaha/shared/announcements';

/** A type's words, as the catalogue gives them. */
type TypeWords = {
  types: Readonly<Record<AnnouncementType, string>>;
  hints: Readonly<Record<AnnouncementType, string>>;
};

/** What changes a visit warns: an outage and a closure (OW-014). */
const WARNS: readonly AnnouncementType[] = ['OUTAGE', 'CLOSURE'];

/**
 * An announcement's type as its card and the sheet show it: its name, the badge's tone — `warning`
 * for an outage or a closure, `neutral` otherwise (DI-15) — and what it does.
 */
export function typeView(
  type: AnnouncementType,
  words: TypeWords,
): { label: string; tone: 'warning' | 'neutral'; hint: string } {
  return {
    label: words.types[type],
    tone: WARNS.includes(type) ? 'warning' : 'neutral',
    hint: words.hints[type],
  };
}
