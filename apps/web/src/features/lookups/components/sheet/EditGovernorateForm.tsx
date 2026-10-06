import type { AdminGovernorate } from '@masaha/shared/lookups';
import { useEditGovernorateForm } from '../../hooks/edit/useEditGovernorateForm';
import { LookupForm } from './LookupForm';

/** The sheet's form for `governorate`, as it stands; `onSaved` closes the sheet. */
export function EditGovernorateForm({
  governorate,
  onSaved,
}: {
  governorate: AdminGovernorate;
  onSaved: () => void;
}) {
  return <LookupForm form={useEditGovernorateForm({ governorate, onSaved })} />;
}
