import type { AdminSpace } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';
import { updatedAgo } from '../../services/updatedAgo';
import type { EditorPlace } from '../../types/EditorPlace';

/**
 * The prices as an owner's editor draws them: a row that leads to Packages & prices, where they are
 * edited and confirmed, with their date, «قديمة» when stale, or that they were never added. The
 * admin edits them in the editor itself, so it has none (`null`).
 */
export function usePricesLink(space: AdminSpace | undefined, place: EditorPlace) {
  const copy = useCopy();
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  if (place === 'admin' || space === undefined) return null;

  const words = copy.spaces.editor;
  const date = space.updatedAt.prices;
  const missing = date === null;
  return {
    title: words.sections.prices,
    description: words.owner.pricesLink.description,
    date: missing
      ? words.section.notAdded
      : words.section.updated({ ago: updatedAgo(date, language, new Date()) }),
    missing,
    stale: !missing && space.staleGroups.includes('prices') ? words.section.stale : null,
    action: { label: words.owner.pricesLink.action },
  };
}
