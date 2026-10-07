import { AMENITY_ICON_KEYS, type AmenityIconKey } from '@masaha/shared/lookups';
import { useCopy } from '@shared/copy';
import { useServerForm, type ServerFormOptions } from '@shared/forms';
import { useWatch, type DefaultValues } from 'react-hook-form';
import type { AmenityFormView } from '../types/AmenityFormView';

/**
 * Every value an amenity's form may hold. Each form sets the ones its request takes, and its schema
 * keeps only those: the Active switch only when editing.
 */
type AmenityValues = {
  nameAr: string;
  nameEn: string;
  icon: AmenityIconKey;
  isFilterable: boolean;
  isActive: boolean;
};

/**
 * What an amenity's forms share, on the one form pattern (`useServerForm`): the two names, then the
 * icon, chosen from the shared keys, each named; the filter switch; and when `editing`, the Active
 * switch, since a new amenity is always active. The save sends the request (`save`), then closes the
 * sheet (`onSaved`) once the list shows the change.
 */
export function useAmenityForm<Request>({
  schema,
  defaultValues,
  editing,
  save,
  onSaved,
}: {
  schema: ServerFormOptions<AmenityValues, Request>['schema'];
  defaultValues: DefaultValues<AmenityValues>;
  editing: boolean;
  save: (request: Request) => Promise<unknown>;
  onSaved: () => void;
}): AmenityFormView {
  const copy = useCopy();
  const lines = copy.lookups.sheet;
  const { field, submit, isPending, blocked, errors, failure, form } = useServerForm<
    AmenityValues,
    Request
  >({
    schema,
    defaultValues,
    fields: ['nameAr', 'nameEn', 'icon'],
    submit: async (request) => {
      await save(request);
      onSaved();
    },
    failureTitle: lines.saveFailed,
    fieldLines: { nameAr: lines.fieldErrors.nameAr, nameEn: lines.fieldErrors.nameEn },
  });
  const [icon, isFilterable, isActive] = useWatch({
    control: form.control,
    name: ['icon', 'isFilterable', 'isActive'],
  });
  const toggle = (name: 'isFilterable' | 'isActive') => (checked: boolean) => {
    form.setValue(name, checked, { shouldDirty: true });
  };

  return {
    field,
    submit,
    isPending,
    blocked,
    errors: { nameAr: errors.nameAr, nameEn: errors.nameEn, icon: errors.icon },
    failure,
    labels: { nameAr: lines.nameAr, nameEn: lines.nameEn, save: lines.save },
    icon: {
      label: lines.icon,
      value: icon,
      options: AMENITY_ICON_KEYS.map((key) => ({ value: key, label: copy.lookups.icons[key] })),
      disabled: isPending,
      ref: field('icon').ref,
      choose: (value) => {
        const key = AMENITY_ICON_KEYS.find((one) => one === value);
        if (key === undefined) return;
        // Once the form was sent, the choice clears the icon's error as it is made.
        form.setValue('icon', key, {
          shouldDirty: true,
          shouldValidate: form.formState.isSubmitted,
        });
      },
    },
    filter: {
      label: lines.inFilters,
      hint: lines.inFiltersHint,
      checked: isFilterable,
      disabled: isPending,
      toggle: toggle('isFilterable'),
    },
    ...(editing && {
      active: {
        label: lines.amenityActive,
        hint: lines.amenityActiveHint,
        checked: isActive,
        disabled: isPending,
        toggle: toggle('isActive'),
      },
    }),
  };
}
