import type { AdminSpace } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';

/**
 * A verified space's amenities to read: the platform's, named by the field the page hands in, and
 * its own, each in the interface's language when it has a name in it, else in Arabic, marked.
 */
export function useReadOnlyAmenities(space: AdminSpace) {
  const copy = useCopy();
  const english = useLanguage() === 'en';
  const words = copy.spaces.editor;
  return {
    title: words.sections.amenities,
    availableLabel: words.amenities.available,
    ownLabel: words.amenities.own,
    none: words.readOnly.none,
    amenityIds: space.amenityIds,
    // Keyed by the Arabic name, the one a space holds once; an English name may repeat.
    own: space.ownAmenities.map((own) =>
      english && own.nameEn !== null
        ? { key: own.nameAr, text: own.nameEn, lang: 'en' as const, dir: 'ltr' as const }
        : { key: own.nameAr, text: own.nameAr, lang: 'ar' as const, dir: 'rtl' as const },
    ),
  };
}
