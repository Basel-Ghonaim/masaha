import { useLanguage } from '@shared/localisation';
import { useAmenitiesQuery } from '../list/useAmenitiesQuery';

// Western digits in both languages (docs/frontend/localisation.md › Formatting).
const ARABIC = 'ar-u-nu-latn';

/**
 * A space's amenities as one line, in the list's order, named in the interface's language, retired
 * ones included: what the space has. Empty while the list loads or once it has failed.
 */
export function useAmenityNames(ids: number[]): string {
  const english = useLanguage() === 'en';
  const query = useAmenitiesQuery();
  const names = (query.data ?? [])
    .filter((amenity) => ids.includes(amenity.id))
    .map((amenity) => (english ? amenity.nameEn : amenity.nameAr));
  return new Intl.ListFormat(english ? 'en' : ARABIC, { type: 'conjunction' }).format(names);
}
