import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';
import type { PlaceValue } from '../../types/PlaceValue';
import { useGovernoratesQuery } from '../list/useGovernoratesQuery';

const ALL = 'all';

/** The option of a choice. */
function optionOf(value: PlaceValue): string {
  if (value === null) return ALL;
  return 'areaId' in value
    ? `area-${String(value.areaId)}`
    : `governorate-${String(value.governorateId)}`;
}

/** The choice of an option; one that names nothing chooses none. */
function valueOf(option: string): PlaceValue {
  const [kind, id] = option.split('-');
  const number = Number(id);
  if (!Number.isInteger(number)) return null;
  if (kind === 'governorate') return { governorateId: number };
  if (kind === 'area') return { areaId: number };
  return null;
}

/**
 * The one field that chooses a governorate or one of its areas, ready to render: "All areas", then
 * each governorate followed by its areas, in order, named in the interface's language. Hidden ones
 * are offered too, marked: a hidden area's spaces still exist. It reads the admin's lists, so it
 * shares the lookups page's cache. While they load, or once they have failed, it says so.
 */
export function useGovernorateAreaOptions({
  value,
  onValueChange,
}: {
  value: PlaceValue;
  onValueChange: (value: PlaceValue) => void;
}) {
  const copy = useCopy();
  const english = useLanguage() === 'en';
  const query = useGovernoratesQuery();
  const labelOf = (place: { nameAr: string; nameEn: string; isActive: boolean }) => {
    const name = english ? place.nameEn : place.nameAr;
    return place.isActive ? name : copy.lookups.placeSelect.hidden({ name });
  };

  return {
    status: query.isPending
      ? ('loading' as const)
      : query.data === undefined
        ? ('error' as const)
        : ('ready' as const),
    value: optionOf(value),
    choose: (option: string) => {
      onValueChange(valueOf(option));
    },
    all: { value: ALL, label: copy.lookups.placeSelect.all },
    groups: (query.data ?? []).map((governorate) => ({
      key: optionOf({ governorateId: governorate.id }),
      label: labelOf(governorate),
      options: [
        {
          value: optionOf({ governorateId: governorate.id }),
          label: labelOf(governorate),
          area: false,
        },
        ...governorate.areas.map((area) => ({
          value: optionOf({ areaId: area.id }),
          label: labelOf(area),
          area: true,
        })),
      ],
    })),
    loadingLabel: copy.status.loading,
    failedLabel: copy.lookups.placeSelect.loadFailed,
  };
}
