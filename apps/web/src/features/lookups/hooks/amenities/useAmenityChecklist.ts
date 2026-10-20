import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';
import type { LookupsSource } from '../../types/LookupsSource';
import { useCatalogueQuery } from '../area/useCatalogueQuery';
import { useAmenitiesQuery } from '../list/useAmenitiesQuery';

/**
 * A space's amenities to tick, ready to render: the platform's active amenities, in order, named in
 * the interface's language, and any retired one the space still has (`linked`), marked, so it is
 * seen and can be left out; a retired one it does not have is never offered. Ticking one adds it to
 * the value, unticking it takes it out. While the list loads, or once it has failed, it says so.
 *
 * That is the admin's list (`source`). The public catalogue an owner reads names only the active
 * amenities: a retired one the space still has stays in the value, unseen, never toggled, and one
 * line counts them (`retiredKept`).
 */
export function useAmenityChecklist({
  source,
  value,
  linked,
  onValueChange,
}: {
  source: LookupsSource;
  value: number[];
  linked: number[];
  onValueChange: (ids: number[]) => void;
}) {
  const copy = useCopy();
  const english = useLanguage() === 'en';
  const adminList = useAmenitiesQuery({ enabled: source === 'admin' });
  const catalogue = useCatalogueQuery({ enabled: source === 'public' });
  const query = source === 'admin' ? adminList : catalogue;
  const offered =
    source === 'admin'
      ? (adminList.data ?? []).filter((amenity) => amenity.isActive || linked.includes(amenity.id))
      : (catalogue.data?.amenities ?? []).map((amenity) => ({ ...amenity, isActive: true }));
  const unseen =
    source === 'public' && catalogue.data !== undefined
      ? value.filter((id) => !offered.some((amenity) => amenity.id === id)).length
      : 0;

  return {
    status: query.isPending
      ? ('loading' as const)
      : query.data === undefined
        ? ('error' as const)
        : ('ready' as const),
    items: offered.map((amenity) => ({
      id: amenity.id,
      name: english ? amenity.nameEn : amenity.nameAr,
      checked: value.includes(amenity.id),
      inactive: !amenity.isActive,
      toggle: (checked: boolean) => {
        onValueChange(checked ? [...value, amenity.id] : value.filter((id) => id !== amenity.id));
      },
    })),
    retiredKept: unseen === 0 ? null : copy.lookups.amenityChecklist.retiredKept({ count: unseen }),
    retry: () => {
      void query.refetch();
    },
    words: {
      loading: copy.status.loading,
      failed: copy.lookups.amenities.loadFailed,
      retry: copy.status.retry,
      inactive: copy.lookups.amenities.row.inactive,
      empty: copy.lookups.amenityChecklist.empty,
    },
  };
}
