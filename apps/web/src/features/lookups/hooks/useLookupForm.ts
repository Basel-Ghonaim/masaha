import { useCopy } from '@shared/copy';
import { useServerForm, type ServerFormOptions } from '@shared/forms';
import type { DefaultValues } from 'react-hook-form';
import type { Positioned } from '../services/withPosition';
import type { LookupFormView } from '../types/LookupFormView';
import type { RowPlace } from '../types/RowPlace';
import { useRowPosition } from './useRowPosition';

/**
 * Every value a sheet's form may hold. Each form sets the ones its request takes, and its schema
 * keeps only those: the governorate an area is added to; the position, typed, is the list's.
 */
type LookupValues = { governorateId: number; nameAr: string; nameEn: string; position: string };

/**
 * What every form of the sheet shares, on the one form pattern (`useServerForm`): the two names, in
 * that order, each with its own line when it is empty, and the Arabic one with `taken` when the
 * server finds it taken; and, editing a row of a list of more than ten (`place`), its position. The
 * row's switch stays in its row, the one control of whether it is shown. The save sends the request
 * (`save`), then the new position, if any, then closes the sheet (`onSaved`) once the list shows the
 * change.
 */
export function useLookupForm<Request>({
  schema,
  defaultValues,
  save,
  onSaved,
  taken,
  place,
}: {
  schema: ServerFormOptions<LookupValues, Request>['schema'];
  defaultValues: DefaultValues<LookupValues>;
  save: (request: Request) => Promise<unknown>;
  onSaved: () => void;
  taken: string;
  place?: RowPlace;
}): LookupFormView {
  const copy = useCopy();
  const lines = copy.lookups.sheet;
  const position = useRowPosition(place);
  const { field, submit, isPending, blocked, errors, failure } = useServerForm<
    LookupValues,
    Positioned<Request>
  >({
    schema: position.schema(schema),
    defaultValues: { ...defaultValues, position: position.defaultValue },
    fields: ['nameAr', 'nameEn', 'position'],
    prepare: (values) => ({ ...values, position: position.input(values.position) }),
    submit: async ({ position: to, ...request }) => {
      await save(request as Request);
      await position.save(to);
      onSaved();
    },
    failureTitle: lines.saveFailed,
    fieldLines: {
      nameAr: { ...lines.fieldErrors.nameAr, not_unique: taken },
      nameEn: lines.fieldErrors.nameEn,
      position: position.lines,
    },
  });
  const positionField = position.view(field('position'), errors.position);

  return {
    field,
    submit,
    isPending,
    blocked,
    errors: { nameAr: errors.nameAr, nameEn: errors.nameEn },
    failure,
    labels: { nameAr: lines.nameAr, nameEn: lines.nameEn, save: lines.save },
    ...(positionField && { position: positionField }),
  };
}
