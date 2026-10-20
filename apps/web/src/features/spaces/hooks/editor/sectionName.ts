import type { FactGroup } from '@masaha/shared/spaces';
import type { Catalogue } from '@shared/copy';
import type { EditorPlace } from '../../types/EditorPlace';

/**
 * A section's name, as its frame titles it and its toasts and failures say it: the group's, but for
 * the owner's prices, which live on Packages & prices titled «الأسعار المعلنة», so one card is
 * named one way.
 */
export function sectionName(place: EditorPlace, group: FactGroup, copy: Catalogue): string {
  const words = copy.spaces.editor;
  return place === 'owner' && group === 'prices'
    ? words.prices.publishedTitle
    : words.sections[group];
}
