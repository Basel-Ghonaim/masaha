import { AMENITY_ICON_KEYS, type AmenityIconKey } from '@masaha/shared/lookups';
import { useCopy } from '@shared/copy';
import { useServerForm, type ServerFormOptions } from '@shared/forms';
import { useController, type DefaultValues } from 'react-hook-form';
import type { Positioned } from '../services/withPosition';
import type { AmenityFormView } from '../types/AmenityFormView';
import type { RowPlace } from '../types/RowPlace';
import { useRowPosition } from './useRowPosition';

/**
 * Every value an amenity's form may hold: its names, its icon, and the position, typed, which is
 * its list's. A new amenity has no icon until one is chosen.
 */
type AmenityValues = {
  nameAr: string;
  nameEn: string;
  icon: AmenityIconKey | undefined;
  position: string;
};

/**
 * What an amenity's forms share, on the one form pattern (`useServerForm`): the two names, then the
 * icon, chosen from the shared keys, each named; and, editing an amenity of a list of more than ten
 * (`place`), its position. Its switch stays in its row, the one control of whether it is offered.
 * The save sends the request (`save`), then the new position, if any, then closes the sheet
 * (`onSaved`) once the list shows the change.
 */
export function useAmenityForm<Request>({
  schema,
  defaultValues,
  save,
  onSaved,
  place,
}: {
  schema: ServerFormOptions<AmenityValues, Request>['schema'];
  defaultValues: DefaultValues<AmenityValues>;
  save: (request: Request) => Promise<unknown>;
  onSaved: () => void;
  place?: RowPlace;
}): AmenityFormView {
  const copy = useCopy();
  const lines = copy.lookups.sheet;
  const position = useRowPosition(place);
  const { field, submit, isPending, blocked, errors, failure, form } = useServerForm<
    AmenityValues,
    Positioned<Request>
  >({
    schema: position.schema(schema),
    defaultValues: { ...defaultValues, position: position.defaultValue },
    fields: ['nameAr', 'nameEn', 'icon', 'position'],
    prepare: (values) => ({ ...values, position: position.input(values.position) }),
    submit: async ({ position: to, ...request }) => {
      await save(request as Request);
      await position.save(to);
      onSaved();
    },
    failureTitle: lines.saveFailed,
    fieldLines: {
      nameAr: lines.fieldErrors.nameAr,
      // A new amenity's key is its English name: taken by another, or one that yields no key.
      nameEn: { ...lines.fieldErrors.nameEn, not_unique: lines.fieldErrors.amenityTaken },
      icon: lines.fieldErrors.icon,
      position: position.lines,
    },
  });
  // The icon is held by the form, not read from the grid: its ref only takes the focus when the
  // icon is missing, where `register` would read a value from the option it is given.
  const { field: icon } = useController({ control: form.control, name: 'icon' });
  const positionField = position.view(field('position'), errors.position);

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
      value: icon.value ?? '',
      options: AMENITY_ICON_KEYS.map((key) => ({ value: key, label: copy.lookups.icons[key] })),
      disabled: isPending,
      ref: icon.ref,
      choose: (value) => {
        const key = AMENITY_ICON_KEYS.find((one) => one === value);
        // Once the form was sent, the choice clears the icon's error as it is made.
        if (key !== undefined) icon.onChange(key);
      },
    },
    ...(positionField && { position: positionField }),
  };
}
