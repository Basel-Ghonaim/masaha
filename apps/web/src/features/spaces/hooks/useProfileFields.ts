import { GAZA_STRIP_BOUNDS, type CreateSpaceRequest } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { isolated, type ServerForm } from '@shared/forms';
import { formatCoordinates, parseCoordinates, type MapPoint } from '@shared/map';
import { useController, useWatch } from 'react-hook-form';
import type { ProfileFieldsView } from '../types/ProfileFieldsView';
import type { ProfileValues } from '../types/ProfileValues';

// The coordinates as a map application copies them, shown as the field's example, its space one
// that never breaks, so a narrow screen keeps the pair on one line.
const EXAMPLE = `31.52,${String.fromCharCode(0xa0)}34.45`;

/**
 * A profile form's fields, ready to render in their sections (`BasicsFields`, `LocationFields`),
 * whether the form adds a space or edits one: each text's bindings and error, their words, the area
 * field's props and the map's. The pin and its coordinates are one value: the map writes the
 * coordinates, and coordinates typed or pasted move the pin.
 */
export function useProfileFields(
  form: ServerForm<ProfileValues, CreateSpaceRequest>,
): ProfileFieldsView {
  const words = useCopy().spaces.add;
  const { control, setValue, formState } = form.form;
  const area = useController({ control, name: 'areaId' });
  const coordinates = useWatch({ control, name: 'location' });

  return {
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
}
