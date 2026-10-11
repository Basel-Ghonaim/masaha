import { Button, Card, CardContent, CardHeader, CardTitle } from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useAddSpaceForm } from '../../hooks/add/useAddSpaceForm';
import type { AreaField } from '../../types/AreaField';
import { BasicsFields } from '../profile/BasicsFields';
import { LocationFields } from '../profile/LocationFields';

/**
 * Adds a space: its basics and its location, each in its own card, then one submit, which sends
 * them as one creation. The area field is the page's to hand in (`areaField`), from the capability
 * that owns the areas; once the space is created, `onCreated` runs.
 */
export function AddSpaceForm({
  areaField,
  onCreated,
}: {
  areaField: AreaField;
  onCreated: () => void;
}) {
  const form = useAddSpaceForm({ onCreated });

  return (
    <form noValidate onSubmit={form.submit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{form.labels.basics}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BasicsFields form={form} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{form.labels.location}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LocationFields form={form} areaField={areaField} />
        </CardContent>
      </Card>
      {form.failure && <FormFailure view={form.failure} />}
      <div>
        <Button type="submit" loading={form.isPending} disabled={form.blocked}>
          {form.submitLabel}
        </Button>
      </div>
    </form>
  );
}
