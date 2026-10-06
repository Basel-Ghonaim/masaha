import { useAddAreaForm } from '../../hooks/add/useAddAreaForm';
import { LookupForm } from './LookupForm';

/** The sheet's form for a new area of governorate `governorateId`; `onSaved` closes the sheet. */
export function AddAreaForm({
  governorateId,
  onSaved,
}: {
  governorateId: number;
  onSaved: () => void;
}) {
  return <LookupForm form={useAddAreaForm({ governorateId, onSaved })} />;
}
