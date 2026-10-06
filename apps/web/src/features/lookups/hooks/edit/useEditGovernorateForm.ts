import { updateGovernorateSchema, type AdminGovernorate } from '@masaha/shared/lookups';
import { useCopy } from '@shared/copy';
import { useLookupForm } from '../useLookupForm';
import { useEditGovernorate } from './useEditGovernorate';

/** The sheet's form for `governorate`: its two names and whether it is shown, as they stand. */
export function useEditGovernorateForm({
  governorate,
  onSaved,
}: {
  governorate: AdminGovernorate;
  onSaved: () => void;
}) {
  const copy = useCopy();
  const edit = useEditGovernorate(governorate.id);

  return useLookupForm({
    schema: updateGovernorateSchema,
    defaultValues: {
      nameAr: governorate.nameAr,
      nameEn: governorate.nameEn,
      isActive: governorate.isActive,
    },
    editing: true,
    save: (request) => edit.mutateAsync(request),
    onSaved,
    taken: copy.lookups.sheet.fieldErrors.governorateTaken,
  });
}
