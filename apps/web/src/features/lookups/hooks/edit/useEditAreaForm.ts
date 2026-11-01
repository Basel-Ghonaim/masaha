import { updateAreaSchema, type AdminArea } from '@masaha/shared/lookups';
import { useCopy } from '@shared/copy';
import { useGovernoratesQuery } from '../list/useGovernoratesQuery';
import { useOrderAreas } from '../order/useOrderAreas';
import { useLookupForm } from '../useLookupForm';
import { useEditArea } from './useEditArea';

/**
 * The sheet's form for `area`: its two names, as they stand, and its position among its
 * governorate's areas when there are more than ten.
 */
export function useEditAreaForm({ area, onSaved }: { area: AdminArea; onSaved: () => void }) {
  const copy = useCopy();
  const edit = useEditArea(area.id);
  const order = useOrderAreas();
  const { data: governorates = [] } = useGovernoratesQuery();
  const { governorateId, id: areaId } = area;
  const areas = governorates.find(({ id }) => id === governorateId)?.areas ?? [];

  return useLookupForm({
    schema: updateAreaSchema,
    defaultValues: { nameAr: area.nameAr, nameEn: area.nameEn },
    save: (request) => edit.mutateAsync(request),
    onSaved,
    taken: copy.lookups.sheet.fieldErrors.areaTaken,
    place: {
      id: areaId,
      ids: areas.map(({ id }) => id),
      order: (ids) => order.mutateAsync({ governorateId, areaId, ids }),
    },
  });
}
