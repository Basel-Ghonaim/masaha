import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';
import { knownAmenityIcon } from '@shared/lib';
import type { LookupsSource } from '../../types/LookupsSource';
import type { RetiredAmenity } from '../../types/RetiredAmenity';
import { useCatalogueQuery } from '../area/useCatalogueQuery';
import { useAmenitiesQuery } from '../list/useAmenitiesQuery';

/**
 * A space's amenities to tick, ready to render: the platform's active amenities, in order, named in
 * the interface's language, and any retired one the space still has (`linked`), marked, so it is
 * seen and can be left out; a retired one it does not have is never offered. Ticking one adds it to
 * the value, unticking it takes it out. While the list loads, or once it has failed, it says so.
 *
 * From the admin's list (`source`) a retired one is named by that list and marked «غير نشط». The
 * public catalogue an owner reads names only the active amenities: the retired ones the space holds
 * come named with the space's read (`retired`, in the platform's order), listed after the others,
 * marked «أُزيل من القائمة», ticked while the value holds them, and left out of the next
 * save once unticked (finding 99). On either list, one ticked but not linked that is retired before
 * the save is no longer offered, and the next toggle drops it from the value.
 */
export function useAmenityChecklist({
  source,
  value,
  linked,
  retired = [],
  onValueChange,
}: {
  source: LookupsSource;
  value: number[];
  linked: number[];
  retired?: readonly RetiredAmenity[];
  onValueChange: (ids: number[]) => void;
}) {
  const copy = useCopy();
  const english = useLanguage() === 'en';
  const adminList = useAmenitiesQuery({ enabled: source === 'admin' });
  const catalogue = useCatalogueQuery({ enabled: source === 'public' });
  const query = source === 'admin' ? adminList : catalogue;
  const active = (catalogue.data?.amenities ?? []).map((amenity) => ({
    ...amenity,
    icon: knownAmenityIcon(amenity.icon),
    isActive: true,
  }));
  const offered =
    source === 'admin'
      ? (adminList.data ?? [])
          .filter((amenity) => amenity.isActive || linked.includes(amenity.id))
          .map((amenity) => ({ ...amenity, icon: knownAmenityIcon(amenity.icon) }))
      : catalogue.data === undefined
        ? []
        : [
            ...active,
            // The space's own retired amenities, which the catalogue no longer names.
            ...retired
              .filter(({ id }) => linked.includes(id) && !active.some((one) => one.id === id))
              .map(({ id, nameAr, nameEn, iconKey }) => ({
                id,
                nameAr,
                nameEn,
                icon: knownAmenityIcon(iconKey),
                isActive: false,
              })),
          ];
  const isOffered = (id: number) => offered.some((amenity) => amenity.id === id);
  const retiredMark =
    source === 'admin'
      ? copy.lookups.amenities.row.inactive
      : copy.lookups.amenityChecklist.retired;
  // An amenity ticked and retired before the save is neither offered nor linked: unseen, it cannot
  // be unticked, so the next tick or untick leaves it out.
  const kept = value.filter((id) => isOffered(id) || linked.includes(id));

  return {
    status: query.isPending
      ? ('loading' as const)
      : query.data === undefined
        ? ('error' as const)
        : ('ready' as const),
    items: offered.map((amenity) => ({
      id: amenity.id,
      name: english ? amenity.nameEn : amenity.nameAr,
      /** Its glyph, or none when the running bundle does not know the key. */
      icon: amenity.icon,
      checked: value.includes(amenity.id),
      /** The badge of a retired amenity, or none. */
      mark: amenity.isActive ? null : retiredMark,
      toggle: (checked: boolean) => {
        onValueChange(checked ? [...kept, amenity.id] : kept.filter((id) => id !== amenity.id));
      },
    })),
    retry: () => {
      void query.refetch();
    },
    words: {
      loading: copy.status.loading,
      failed: copy.lookups.amenities.loadFailed,
      retry: copy.status.retry,
      empty: copy.lookups.amenityChecklist.empty,
    },
  };
}
