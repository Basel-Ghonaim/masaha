import { createGovernorateSchema } from '@masaha/shared/lookups';
import { useCopy } from '@shared/copy';
import { useLookupForm } from '../useLookupForm';
import { useAddGovernorate } from './useAddGovernorate';

/** The sheet's form for a new governorate: its two names; it is added active, and placed last. */
export function useAddGovernorateForm({ onSaved }: { onSaved: () => void }) {
  const copy = useCopy();
  const add = useAddGovernorate();

  return useLookupForm({
    schema: createGovernorateSchema,
    defaultValues: { nameAr: '', nameEn: '' },
    editing: false,
    save: (request) => add.mutateAsync(request),
    onSaved,
    taken: copy.lookups.sheet.fieldErrors.governorateTaken,
  });
}
