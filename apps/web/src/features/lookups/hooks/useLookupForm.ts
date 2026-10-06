import { useCopy } from '@shared/copy';
import { useServerForm, type ServerFormOptions } from '@shared/forms';
import { useWatch, type DefaultValues } from 'react-hook-form';
import type { LookupFormView } from '../types/LookupFormView';

/**
 * Every value a sheet's form may hold. Each form sets the ones its request takes, and its schema
 * keeps only those: the governorate an area is added to, and the switch only when editing.
 */
type LookupValues = { governorateId: number; nameAr: string; nameEn: string; isActive: boolean };

/**
 * What every form of the sheet shares, on the one form pattern (`useServerForm`): the two names, in
 * that order, each with its own line when it is empty, and the Arabic one with `taken` when the
 * server finds it taken; when `editing`, the Active switch, since a new row is always active. The
 * save sends the request (`save`), then closes the sheet (`onSaved`) once the list shows the change.
 */
export function useLookupForm<Request>({
  schema,
  defaultValues,
  editing,
  save,
  onSaved,
  taken,
}: {
  schema: ServerFormOptions<LookupValues, Request>['schema'];
  defaultValues: DefaultValues<LookupValues>;
  editing: boolean;
  save: (request: Request) => Promise<unknown>;
  onSaved: () => void;
  taken: string;
}): LookupFormView {
  const copy = useCopy();
  const lines = copy.lookups.sheet;
  const { field, submit, isPending, blocked, errors, failure, form } = useServerForm<
    LookupValues,
    Request
  >({
    schema,
    defaultValues,
    fields: ['nameAr', 'nameEn'],
    submit: async (request) => {
      await save(request);
      onSaved();
    },
    failureTitle: lines.saveFailed,
    fieldLines: {
      nameAr: { ...lines.fieldErrors.nameAr, not_unique: taken },
      nameEn: lines.fieldErrors.nameEn,
    },
  });
  const isActive = useWatch({ control: form.control, name: 'isActive' });

  return {
    field,
    submit,
    isPending,
    blocked,
    errors: { nameAr: errors.nameAr, nameEn: errors.nameEn },
    failure,
    labels: { nameAr: lines.nameAr, nameEn: lines.nameEn, save: lines.save },
    ...(editing && {
      active: {
        label: lines.active,
        hint: lines.activeHint,
        checked: isActive,
        disabled: isPending,
        toggle: (checked: boolean) => {
          form.setValue('isActive', checked, { shouldDirty: true });
        },
      },
    }),
  };
}
