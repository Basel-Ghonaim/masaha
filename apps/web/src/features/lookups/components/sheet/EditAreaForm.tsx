import type { AdminArea } from '@masaha/shared/lookups';
import { useEditAreaForm } from '../../hooks/edit/useEditAreaForm';
import { LookupForm } from './LookupForm';

/** The sheet's form for `area`, as it stands; `onSaved` closes the sheet. */
export function EditAreaForm({ area, onSaved }: { area: AdminArea; onSaved: () => void }) {
  return <LookupForm form={useEditAreaForm({ area, onSaved })} />;
}
