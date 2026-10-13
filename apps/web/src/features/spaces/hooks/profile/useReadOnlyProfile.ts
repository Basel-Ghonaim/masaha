import type { AdminSpace } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { formatCoordinates } from '@shared/map';
import type { ReadOnlyRow } from '../../types/ReadOnlyRow';

const ar = { lang: 'ar', dir: 'rtl' } as const;
const en = { lang: 'en', dir: 'ltr' } as const;

/**
 * A verified space's profile to read, ready to render: its basics and its location as labelled
 * values, each text marked with its own language, the pin as its coordinates. The area is named by
 * the field the page hands in.
 */
export function useReadOnlyProfile(space: AdminSpace) {
  const copy = useCopy();
  const words = copy.spaces.add;
  const readOnly = copy.spaces.editor.readOnly;
  const basics: ReadOnlyRow[] = [
    { label: words.nameAr, value: space.nameAr, ...ar },
    { label: words.nameEn, value: space.nameEn, ...en },
    { label: words.descriptionAr, value: space.descriptionAr, ...ar },
    { label: words.descriptionEn, value: space.descriptionEn, ...en },
  ];
  const location: ReadOnlyRow[] = [
    { label: words.addressAr, value: space.addressAr, ...ar },
    { label: words.addressEn, value: space.addressEn, ...en },
    { label: words.landmarkAr, value: space.landmarkAr, ...ar },
    { label: words.landmarkEn, value: space.landmarkEn, ...en },
    { label: readOnly.coordinates, value: formatCoordinates(space.location), dir: 'ltr' },
  ];
  return {
    title: copy.spaces.editor.sections.profile,
    basicsTitle: words.basics,
    locationTitle: words.location,
    areaLabel: readOnly.area,
    none: readOnly.none,
    basics,
    location,
  };
}
