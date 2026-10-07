import { Button, Field, SheetBody, SheetFooter, Switch } from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { AmenityFormView } from '../../types/AmenityFormView';
import { AmenityIconField } from './AmenityIconField';
import { LookupNameFields } from './LookupNameFields';

/**
 * An amenity's form, inside its sheet: the failure, the Arabic and English names, the icon, the
 * filter switch, the Active switch when editing, and Save at the sheet's foot.
 */
export function AmenityForm({ form }: { form: AmenityFormView }) {
  return (
    <form noValidate onSubmit={form.submit} className="flex min-h-0 flex-1 flex-col">
      <SheetBody className="flex flex-col gap-4">
        {form.failure && <FormFailure view={form.failure} />}
        <LookupNameFields form={form} />
        <AmenityIconField icon={form.icon} error={form.errors.icon} />
        <Field orientation="horizontal" label={form.filter.label} helper={form.filter.hint}>
          <Switch
            checked={form.filter.checked}
            disabled={form.filter.disabled}
            onCheckedChange={form.filter.toggle}
          />
        </Field>
        {form.active && (
          <Field orientation="horizontal" label={form.active.label} helper={form.active.hint}>
            <Switch
              checked={form.active.checked}
              disabled={form.active.disabled}
              onCheckedChange={form.active.toggle}
            />
          </Field>
        )}
      </SheetBody>
      <SheetFooter>
        <Button type="submit" loading={form.isPending} disabled={form.blocked}>
          {form.labels.save}
        </Button>
      </SheetFooter>
    </form>
  );
}
