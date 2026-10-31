import { updateAmenitySchema, type AdminAmenity } from '@masaha/shared/lookups';
import { useAmenitiesQuery } from '../list/useAmenitiesQuery';
import { useOrderAmenities } from '../order/useOrderAmenities';
import { useAmenityForm } from '../useAmenityForm';
import { useEditAmenity } from './useEditAmenity';

/**
 * The sheet's form for `amenity`: its names and its icon, as they stand, and its position among the
 * amenities when there are more than ten.
 */
export function useEditAmenityForm({
  amenity,
  onSaved,
}: {
  amenity: AdminAmenity;
  onSaved: () => void;
}) {
  const edit = useEditAmenity(amenity.id);
  const order = useOrderAmenities();
  const { data: amenities = [] } = useAmenitiesQuery();
  const amenityId = amenity.id;

  return useAmenityForm({
    schema: updateAmenitySchema,
    defaultValues: { nameAr: amenity.nameAr, nameEn: amenity.nameEn, icon: amenity.icon },
    save: (request) => edit.mutateAsync(request),
    onSaved,
    place: {
      id: amenityId,
      ids: amenities.map(({ id }) => id),
      order: (ids) => order.mutateAsync({ amenityId, ids }),
    },
  });
}
