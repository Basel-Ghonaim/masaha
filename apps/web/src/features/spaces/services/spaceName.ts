import type { SpaceNameView } from '../types/SpaceNameView';

/**
 * A space's name in the interface's language. Its English name is required and its Arabic one
 * optional, so the Arabic interface shows the English name when there is no other, marked as English
 * (docs/frontend/localisation.md › Content in two languages).
 */
export function spaceNameOf(
  space: { nameEn: string; nameAr: string | null },
  english: boolean,
): SpaceNameView {
  if (english) return { text: space.nameEn };
  return space.nameAr === null
    ? { text: space.nameEn, lang: 'en', dir: 'ltr' }
    : { text: space.nameAr };
}
