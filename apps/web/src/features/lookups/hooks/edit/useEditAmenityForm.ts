import { updateAmenitySchema, type AdminAmenity } from '@masaha/shared/lookups';
import { useAmenityForm } from '../useAmenityForm';
import { useEditAmenity } from './useEditAmenity';

/** The sheet's form for `amenity`: its names, its icon and both its flags, as they stand. */
export function useEditAmenityForm({
  amenity,
  onSaved,
}: {
  amenity: AdminAmenity;
  onSaved: () => void;
}) {
  const edit = useEditAmenity(amenity.id);

  return useAmenityForm({
    schema: updateAmenitySchema,
    defaultValues: {
      nameAr: amenity.nameAr,
      nameEn: amenity.nameEn,
      icon: amenity.icon,
      isFilterable: amenity.isFilterable,
      isActive: amenity.isActive,
    },
    editing: true,
    save: (request) => edit.mutateAsync(request),
    onSaved,
  });
}
