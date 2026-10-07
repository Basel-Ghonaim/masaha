import type { AdminAmenity } from '@masaha/shared/lookups';
import { useCopy } from '@shared/copy';
import { useLanguage } from '@shared/localisation';
import { useMutationState } from '@tanstack/react-query';
import { moved } from '../../services/moved';
import type { RowControlsView } from '../../types/RowControlsView';
import { useSetAmenityFilter } from '../filter/useSetAmenityFilter';
import { amenityActionKey } from '../mutationKeys';
import { useOrderAmenities } from '../order/useOrderAmenities';
import { useSetAmenityVisibility } from '../visibility/useSetAmenityVisibility';
import { useAmenitiesQuery } from './useAmenitiesQuery';
import { useAmenityRowFailure } from './useAmenityRowFailure';
import { useRowViews } from './useRowViews';

/**
 * One amenity's row, ready to render: its icon, its name in the interface's language with the other
 * language as its second line (amenities are common words, unlike place names), its badges when the
 * filter leaves it out or it is retired, its controls, its edit sheet, and the failure of the last
 * action on it. The row owns its own actions, so its last one stays held while the row is on screen,
 * and its failure with it.
 *
 * Each switch waits only on its own write; the arrows on any order of the list (so two orders never
 * race), not on a switch, since an order sends ids alone; every control while the section waits out
 * a 429 (`blocked`).
 */
export function useAmenityRow({ amenity, blocked }: { amenity: AdminAmenity; blocked: boolean }) {
  const copy = useCopy();
  const english = useLanguage() === 'en';
  const { nameOf, controlsOf, editOf } = useRowViews();
  const { data: amenities = [] } = useAmenitiesQuery();
  const setVisibility = useSetAmenityVisibility();
  const setFilter = useSetAmenityFilter();
  const order = useOrderAmenities();
  const amenityId = amenity.id;
  const failure = useAmenityRowFailure(amenityId);
  const listMoving =
    useMutationState({
      filters: { mutationKey: amenityActionKey('amenityOrder'), status: 'pending' },
    }).length > 0;
  const ids = amenities.map(({ id }) => id);
  const name = nameOf(amenity);
  const lines = copy.lookups.amenities.row;
  const arabic = { text: amenity.nameAr, lang: 'ar' as const };
  const latin = { text: amenity.nameEn, lang: 'en' as const };

  const controls = controlsOf(
    name,
    amenity.isActive,
    { index: ids.indexOf(amenityId), count: ids.length, busy: blocked, listMoving },
    (isActive) => {
      setVisibility.mutate({ amenityId, isActive });
    },
    (direction) => {
      order.mutate({ amenityId, ids: moved(ids, amenityId, direction) });
    },
  );

  return {
    failure,
    icon: amenity.icon,
    name: english ? latin : arabic,
    other: english ? arabic : latin,
    inactive: !amenity.isActive,
    inactiveLabel: lines.inactive,
    notFiltered: !amenity.isFilterable,
    notFilteredLabel: lines.notFiltered,
    edit: editOf(name, copy.lookups.sheet.editAmenity),
    controls: {
      ...controls,
      shown: {
        ...controls.shown,
        label: lines.activeName({ name }),
        text: lines.active,
        waiting: setVisibility.isPending || blocked,
      },
      switches: [
        {
          label: lines.inFiltersName({ name }),
          text: lines.inFilters,
          checked: amenity.isFilterable,
          waiting: setFilter.isPending || blocked,
          toggle: (isFilterable) => {
            setFilter.mutate({ amenityId, isFilterable });
          },
        },
      ],
    } satisfies RowControlsView,
  };
}
