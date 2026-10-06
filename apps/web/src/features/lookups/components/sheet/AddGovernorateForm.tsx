import { useAddGovernorateForm } from '../../hooks/add/useAddGovernorateForm';
import { LookupForm } from './LookupForm';

/** The sheet's form for a new governorate; `onSaved` closes the sheet. */
export function AddGovernorateForm({ onSaved }: { onSaved: () => void }) {
  return <LookupForm form={useAddGovernorateForm({ onSaved })} />;
}
