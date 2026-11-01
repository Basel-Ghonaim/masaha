import { Button, SheetBody, SheetFooter } from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { AmenityFormView } from '../../types/AmenityFormView';
import { AmenityIconField } from './AmenityIconField';
import { LookupNameFields } from './LookupNameFields';
import { PositionField } from './PositionField';

/**
 * An amenity's form, inside its sheet: the failure, the Arabic and English names, the icon, the
 * position when editing an amenity of a list of more than ten, and Save at the sheet's foot. The
 * amenity's switch stays in its row.
 */
export function AmenityForm({ form }: { form: AmenityFormView }) {
  return (
    <form noValidate onSubmit={form.submit} className="flex min-h-0 flex-1 flex-col">
      <SheetBody className="flex flex-col gap-4">
        {form.failure && <FormFailure view={form.failure} />}
        <LookupNameFields form={form} />
        <AmenityIconField icon={form.icon} error={form.errors.icon} />
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
