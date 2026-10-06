import { createAreaSchema } from '@masaha/shared/lookups';
import { useCopy } from '@shared/copy';
import { useLookupForm } from '../useLookupForm';
import { useAddArea } from './useAddArea';

/**
 * The sheet's form for a new area of governorate `governorateId`: its two names; it is added active,
 * and placed last in its governorate.
 */
export function useAddAreaForm({
  governorateId,
  onSaved,
}: {
  governorateId: number;
  onSaved: () => void;
}) {
  const copy = useCopy();
  const add = useAddArea();

  return useLookupForm({
    schema: createAreaSchema,
    defaultValues: { governorateId, nameAr: '', nameEn: '' },
    editing: false,
    save: (request) => add.mutateAsync(request),
    onSaved,
    taken: copy.lookups.sheet.fieldErrors.areaTaken,
  });
}
