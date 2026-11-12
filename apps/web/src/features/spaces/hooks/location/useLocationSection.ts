import { useCopy } from '@shared/copy';
import { mapsLink } from '@shared/lib';
import { useLanguage } from '@shared/localisation';
import type { SectionHost } from '../../types/SectionHost';
import { useSectionFrame } from '../editor/useSectionFrame';

/**
 * «الموقع», read first (L1): the area; the address in the interface's language, the other muted under
 * it, each in its own language and direction; the landmark when set, in the interface's language or
 * else the other, in its own language and direction too; what a missing English address costs; and a
 * small map with the pin and «فتح في خرائط Google», the visitors' directions. Its fields are
 * required, so it is never empty; its head is the profile group's.
 */
export function useLocationSection(host: SectionHost) {
  const words = useCopy().spaces.editor.location;
  const english = useLanguage() === 'en';
  const { space } = host;
  const frame = useSectionFrame({
    place: host.place,
    space,
    section: 'location',
    editable: host.editable,
    empty: false,
    edit: () => {
      host.openSheet('location');
    },
  });
  const arabic = { text: space.addressAr, lang: 'ar' as const, dir: 'rtl' as const };
  const inEnglish =
    space.addressEn === null
      ? null
      : { text: space.addressEn, lang: 'en' as const, dir: 'ltr' as const };
  const shown = english ? (inEnglish ?? arabic) : arabic;
  const other = english ? (inEnglish === null ? null : arabic) : inEnglish;
  // The landmark in the interface's language, else in the other, each with its own language.
  const landmarkAr = space.landmarkAr === null ? null : { ...arabic, text: space.landmarkAr };
  const landmarkEn =
    space.landmarkEn === null
      ? null
      : { text: space.landmarkEn, lang: 'en' as const, dir: 'ltr' as const };
  const landmark = english ? (landmarkEn ?? landmarkAr) : (landmarkAr ?? landmarkEn);
  return {
    frame,
    areaId: space.areaId,
    address: shown,
    otherAddress: other,
    landmark: landmark === null ? null : { label: words.landmark, ...landmark },
    missingEnglish: space.addressEn === null ? words.noEnglishAddress : null,
    map: { point: space.location, label: words.mapLabel, failed: words.mapFailed },
    directions: { label: words.openMaps, href: mapsLink(space.location) },
  };
}

export type LocationSectionView = ReturnType<typeof useLocationSection>;
