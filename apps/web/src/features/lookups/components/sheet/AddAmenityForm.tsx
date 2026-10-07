import { useAddAmenityForm } from '../../hooks/add/useAddAmenityForm';
import { AmenityForm } from './AmenityForm';

/** The sheet's form for a new amenity; `onSaved` closes the sheet. */
export function AddAmenityForm({ onSaved }: { onSaved: () => void }) {
  return <AmenityForm form={useAddAmenityForm({ onSaved })} />;
}
