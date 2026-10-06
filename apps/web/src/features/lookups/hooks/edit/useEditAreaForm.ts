import { updateAreaSchema, type AdminArea } from '@masaha/shared/lookups';
import { useCopy } from '@shared/copy';
import { useLookupForm } from '../useLookupForm';
import { useEditArea } from './useEditArea';

/** The sheet's form for `area`: its two names and whether it is shown, as they stand. */
export function useEditAreaForm({ area, onSaved }: { area: AdminArea; onSaved: () => void }) {
  const copy = useCopy();
  const edit = useEditArea(area.id);

  return useLookupForm({
    schema: updateAreaSchema,
    defaultValues: { nameAr: area.nameAr, nameEn: area.nameEn, isActive: area.isActive },
    editing: true,
    save: (request) => edit.mutateAsync(request),
    onSaved,
    taken: copy.lookups.sheet.fieldErrors.areaTaken,
  });
}
