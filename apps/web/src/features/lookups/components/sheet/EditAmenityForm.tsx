import type { AdminAmenity } from '@masaha/shared/lookups';
import { useEditAmenityForm } from '../../hooks/edit/useEditAmenityForm';
import { AmenityForm } from './AmenityForm';

/** The sheet's form for `amenity`, as it stands; `onSaved` closes the sheet. */
export function EditAmenityForm({
  amenity,
  onSaved,
}: {
  amenity: AdminAmenity;
  onSaved: () => void;
}) {
  return <AmenityForm form={useEditAmenityForm({ amenity, onSaved })} />;
}
