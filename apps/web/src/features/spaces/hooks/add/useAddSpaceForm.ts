import {
  createSpaceSchema,
  GAZA_STRIP_BOUNDS,
  type CreateSpaceRequest,
} from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { isolated, useServerForm } from '@shared/forms';
import { formatCoordinates, parseCoordinates, type MapPoint } from '@shared/map';
import { useController, useWatch } from 'react-hook-form';
import { profileInput } from '../../services/profileInput';
import type { ProfileFieldsView } from '../../types/ProfileFieldsView';
import type { ProfileValues } from '../../types/ProfileValues';
import { useCreateSpace } from './useCreateSpace';

const EMPTY: ProfileValues = {
  nameAr: '',
  nameEn: '',
  descriptionAr: '',
  descriptionEn: '',
  areaId: null,
  addressAr: '',
  addressEn: '',
  landmarkAr: '',
  landmarkEn: '',
  location: '',
};

// The fields in the order the form shows them: a refusal focuses the first it names.
const FIELDS = [
  'nameAr',
  'nameEn',
  'descriptionAr',
  'descriptionEn',
  'areaId',
  'addressAr',
  'addressEn',
  'landmarkAr',
  'landmarkEn',
  'location',
] as const;

// The coordinates as a map application copies them, shown as the field's example, its space one
// that never breaks, so a narrow screen keeps the pair on one line.
const EXAMPLE = `31.52,${String.fromCharCode(0xa0)}34.45`;

/**
 * The add-space form, ready to render: a space's basics and its location, checked in the browser by
 * the contract's schema and sent once. The pin and its coordinates are one value: the map writes the
 * coordinates, and coordinates typed or pasted move the pin. Once the space is created and the
 * admin's lists have been fetched again, the spaces list the page left included, a toast names it
 * and `onCreated` runs.
 */
export function useAddSpaceForm({ onCreated }: { onCreated: () => void }) {
  const copy = useCopy();
  const words = copy.spaces.add;
  const create = useCreateSpace();
  const form = useServerForm<ProfileValues, CreateSpaceRequest>({
    schema: createSpaceSchema,
    defaultValues: EMPTY,
    fields: FIELDS,
    prepare: profileInput,
    submit: async (request) => {
      await create.mutateAsync(request);
      onCreated();
    },
    failureTitle: words.failureTitle,
    fieldLines: words.fieldErrors,
    failureLines: { conflict: words.conflict },
  });
  const { control, setValue, formState } = form.form;
  const area = useController({ control, name: 'areaId' });
  const coordinates = useWatch({ control, name: 'location' });

  const view: ProfileFieldsView = {
    field: form.field,
    errors: form.errors,
    labels: {
      basics: words.basics,
      location: words.location,
      nameAr: words.nameAr,
      nameEn: words.nameEn,
      descriptionAr: words.descriptionAr,
      descriptionEn: words.descriptionEn,
      area: words.area,
      addressAr: words.addressAr,
      addressEn: words.addressEn,
      landmarkAr: words.landmarkAr,
      landmarkEn: words.landmarkEn,
      optional: words.optional,
      pin: words.pin,
      pinHint: words.pinHint,
      coordinates: words.coordinates,
      coordinatesHint: words.coordinatesHint({ example: isolated(EXAMPLE) }),
    },
    area: {
      value: area.field.value,
      onValueChange: area.field.onChange,
      disabled: form.isPending,
      ref: area.field.ref,
    },
    map: {
      value: parseCoordinates(coordinates),
      onChange: (point: MapPoint) => {
        // Once the form has been sent, the field's refusal is checked again as the pin moves.
        setValue('location', formatCoordinates(point), {
          shouldDirty: true,
          shouldValidate: formState.isSubmitted,
        });
      },
      bounds: GAZA_STRIP_BOUNDS,
      label: words.map,
    },
  };

  return {
    ...view,
    submit: form.submit,
    isPending: form.isPending,
    blocked: form.blocked,
    failure: form.failure,
    submitLabel: words.submit,
  };
}
