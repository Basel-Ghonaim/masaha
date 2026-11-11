import { AMENITY_ICON_KEYS, type AmenityIconKey } from '@masaha/shared/lookups';
import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';
import type { AmenityCatalogue } from '../../types/AmenityCatalogue';
import type { SectionHost } from '../../types/SectionHost';
import { useSectionFrame } from '../editor/useSectionFrame';

/** A retired amenity's icon key, as the space's read gives it, when it is one the web draws. */
const iconOf = (key: string): AmenityIconKey | null =>
  AMENITY_ICON_KEYS.find((known) => known === key) ?? null;

/**
 * «المرافق», read first (A1): only what the space offers, as the public page shows it — the
 * platform's, in the list's order, each with its icon and name (a retired one it still holds named
 * from its read), then its own, with a generic icon — never what it lacks. With none, «لم تُضف
 * مرافق بعد» and «أضف المرافق». While the platform's list is read, the section waits for it; once
 * its read has failed, it says so, with «إعادة المحاولة», which reads it again.
 */
export function useAmenitiesSection(host: SectionHost, catalogue: AmenityCatalogue) {
  const copy = useCopy();
  const words = copy.spaces.editor.amenities;
  const english = useLanguage() === 'en';
  const { space } = host;
  const empty = space.amenityIds.length + space.ownAmenities.length === 0;
  const open = () => {
    host.openSheet('amenities');
  };
  const frame = useSectionFrame({
    place: host.place,
    space,
    section: 'amenities',
    editable: host.editable,
    empty,
    edit: open,
  });
  const named = (amenity: { nameAr: string; nameEn: string }) =>
    english ? amenity.nameEn : amenity.nameAr;
  const { entries } = catalogue;
  const listed = (entries ?? []).filter(({ id }) => space.amenityIds.includes(id));
  const retired = space.retiredAmenities.filter(
    ({ id }) => space.amenityIds.includes(id) && !listed.some((one) => one.id === id),
  );
  return {
    frame,
    label: words.offered,
    loading: entries === undefined && space.amenityIds.length > 0 && !catalogue.failed,
    // The platform's list names the amenities the space holds: once its read has failed, it says so.
    failure:
      entries === undefined && space.amenityIds.length > 0 && catalogue.failed
        ? { message: words.listFailed, retry: { label: copy.status.retry, run: catalogue.retry } }
        : null,
    items: [
      ...listed.map((amenity) => ({
        key: `platform-${String(amenity.id)}`,
        name: named(amenity),
        lang: undefined,
        icon: amenity.icon,
      })),
      ...(entries === undefined ? [] : retired).map((amenity) => ({
        key: `platform-${String(amenity.id)}`,
        name: named(amenity),
        lang: undefined,
        icon: iconOf(amenity.iconKey),
      })),
      ...space.ownAmenities.map((own, index) => ({
        key: `own-${String(index)}`,
        name: english ? (own.nameEn ?? own.nameAr) : own.nameAr,
        lang: english && own.nameEn === null ? ('ar' as const) : undefined,
        icon: null,
      })),
    ],
    empty: empty
      ? {
          text: words.empty.text,
          action: host.editable ? { label: words.empty.action, run: open, primary: true } : null,
        }
      : null,
  };
}

export type AmenitiesSectionView = ReturnType<typeof useAmenitiesSection>;
