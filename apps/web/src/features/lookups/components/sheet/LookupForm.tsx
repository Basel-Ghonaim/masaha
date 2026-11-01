import { Button, SheetBody, SheetFooter } from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { LookupFormView } from '../../types/LookupFormView';
import { LookupNameFields } from './LookupNameFields';
import { PositionField } from './PositionField';

/**
 * A governorate's or an area's form, inside its sheet: the failure, the Arabic and English names,
 * the position when editing a row of a list of more than ten, and Save at the sheet's foot. The
 * row's switch stays in its row.
 */
export function LookupForm({ form }: { form: LookupFormView }) {
  return (
    <form noValidate onSubmit={form.submit} className="flex min-h-0 flex-1 flex-col">
      <SheetBody className="flex flex-col gap-4">
        {form.failure && <FormFailure view={form.failure} />}
        <LookupNameFields form={form} />
        {form.position && <PositionField position={form.position} />}
      </SheetBody>
      <SheetFooter>
        <Button type="submit" loading={form.isPending} disabled={form.blocked}>
          {form.labels.save}
        </Button>
      </SheetFooter>
    </form>
  );
}
