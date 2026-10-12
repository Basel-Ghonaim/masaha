import { createAmenitySchema } from '@masaha/shared/lookups';
import { useAmenityForm } from '../useAmenityForm';
import { useAddAmenity } from './useAddAmenity';

/**
 * The sheet's form for a new amenity: its two names, its icon, which the admin chooses (none is
 * chosen for them, so a wrong one is never saved unnoticed). It is added active, and placed last.
 */
export function useAddAmenityForm({ onSaved }: { onSaved: () => void }) {
  const add = useAddAmenity();

  return useAmenityForm({
    schema: createAmenitySchema,
    defaultValues: { nameAr: '', nameEn: '' },
    editing: false,
    save: (request) => add.mutateAsync(request),
    onSaved,
  });
}
