import { updateGovernorateSchema, type AdminGovernorate } from '@masaha/shared/lookups';
import { useCopy } from '@shared/copy';
import { useGovernoratesQuery } from '../list/useGovernoratesQuery';
import { useOrderGovernorates } from '../order/useOrderGovernorates';
import { useLookupForm } from '../useLookupForm';
import { useEditGovernorate } from './useEditGovernorate';

/**
 * The sheet's form for `governorate`: its two names, as they stand, and its position among the
 * governorates when there are more than ten.
 */
export function useEditGovernorateForm({
  governorate,
  onSaved,
}: {
  governorate: AdminGovernorate;
  onSaved: () => void;
}) {
  const copy = useCopy();
  const edit = useEditGovernorate(governorate.id);
  const order = useOrderGovernorates();
  const { data: governorates = [] } = useGovernoratesQuery();
  const governorateId = governorate.id;

  return useLookupForm({
    schema: updateGovernorateSchema,
    defaultValues: { nameAr: governorate.nameAr, nameEn: governorate.nameEn },
    save: (request) => edit.mutateAsync(request),
    onSaved,
    taken: copy.lookups.sheet.fieldErrors.governorateTaken,
    place: {
      id: governorateId,
      ids: governorates.map(({ id }) => id),
      order: (ids) => order.mutateAsync({ governorateId, ids }),
    },
  });
}
