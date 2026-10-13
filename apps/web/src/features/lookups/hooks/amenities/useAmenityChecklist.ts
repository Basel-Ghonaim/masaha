import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';
import { useAmenitiesQuery } from '../list/useAmenitiesQuery';

/**
 * A space's amenities to tick, ready to render: the platform's active amenities, in order, named in
 * the interface's language, and any retired one the space still has (`linked`), marked, so it is
 * seen and can be left out; a retired one it does not have is never offered. Ticking one adds it to
 * the value, unticking it takes it out. While the list loads, or once it has failed, it says so.
 */
export function useAmenityChecklist({
  value,
  linked,
  onValueChange,
}: {
  value: number[];
  linked: number[];
  onValueChange: (ids: number[]) => void;
}) {
  const copy = useCopy();
  const english = useLanguage() === 'en';
  const query = useAmenitiesQuery();
  const offered = (query.data ?? []).filter(
    (amenity) => amenity.isActive || linked.includes(amenity.id),
  );

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
