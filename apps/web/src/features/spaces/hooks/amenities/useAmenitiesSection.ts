import {
  MAX_OWN_AMENITIES,
  updateSpaceAmenitiesSchema,
  type AdminSpace,
  type FactGroup,
  type UpdateSpaceAmenitiesRequest,
} from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { useServerForm, type FormFailureView } from '@shared/forms';
import { toAppError } from '@shared/errors';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useController, useFieldArray, type Path } from 'react-hook-form';
import type { EditorPlace } from '../../types/EditorPlace';
import {
  amenitiesInput,
  amenitiesValues,
  amenityIdsOf,
  sameAmenities,
  type AmenitiesValues,
} from '../../services/amenitiesForm';
import type { AmenitiesFieldProps } from '../../types/AmenitiesField';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { meanwhileLines } from '../editor/meanwhileLines';
import { useSaveGroup } from '../editor/useSaveGroup';
import { useSectionFrame } from '../editor/useSectionFrame';

const OWN_INDEXES = Array.from({ length: MAX_OWN_AMENITIES }, (_, index) => index);

/** An own amenity's name field, by its row. */
const ownName = (index: number, name: 'nameAr' | 'nameEn') =>
  `ownAmenities.${String(index)}.${name}` as `ownAmenities.${number}.${typeof name}`;

// The fields in the order the section shows them: a refusal focuses the first it names.
const FIELDS: Path<AmenitiesValues>[] = [
  'amenityIds',
  ...OWN_INDEXES.flatMap((index) => [ownName(index, 'nameAr'), ownName(index, 'nameEn')]),
];

/**
 * The editor's «المرافق» section, ready to render: the platform's amenities ticked, in the field the
 * page hands in, and the space's own, up to the contract's twenty, an Arabic name each and the
 * English optional, refused on its own row when empty, too long or repeated. Both are one group,
 * saved, dated and confirmed together; a save that changes nothing sends nothing, unless the group
 * was never saved. An amenity ticked that the server no longer offers is said in the section, beside
 * any refusal on the rows, and the lists the checklist reads are fetched again: one the space has
 * stays, marked or counted, and one only ticked, which the server names by its place in the request,
 * leaves the list and the value, so the next save goes without it.
 */
export function useAmenitiesSection({
  place,
  space,
  onDirtyChange,
}: {
  place: EditorPlace;
  space: AdminSpace;
  onDirtyChange: (group: FactGroup, dirty: boolean) => void;
}) {
  const copy = useCopy();
  const scope = EDITOR_SCOPES[place];
  const { repository } = scope;
  const words = copy.spaces.editor.amenities;
  const section = copy.spaces.editor.section;
  const save = useSaveGroup(place, space.id, 'amenities', (request: UpdateSpaceAmenitiesRequest) =>
    repository.updateAmenities(space.id, request),
  );
  const client = useQueryClient();
  const [unchanged, setUnchanged] = useState(false);
  // An amenity ticked that the server refused (422 on `amenityIds`), retired meanwhile.
  const [unavailable, setUnavailable] = useState(false);
  const saved = amenitiesValues(space);
  const missing = space.updatedAt.amenities === null;
  const form = useServerForm<AmenitiesValues, UpdateSpaceAmenitiesRequest>({
    schema: updateSpaceAmenitiesSchema,
    defaultValues: saved,
    fields: FIELDS,
    prepare: amenitiesInput,
    submit: async (request) => {
      setUnavailable(false);
      if (!missing && sameAmenities(request, space)) {
        setUnchanged(true);
        form.form.reset(saved);
        return;
      }
      setUnchanged(false);
      try {
        const answer = await save.mutateAsync(request);
        form.form.reset(amenitiesValues(answer));
      } catch (error) {
        const refused = Object.keys(toAppError(error).errors ?? {});
        if (refused.some((field) => field.startsWith('amenityIds'))) {
          setUnavailable(true);
          // Unseen once the lists arrive again, it could not be unticked: it is taken out now.
          const gone = refused.flatMap((field) => {
            const index = /^amenityIds\.(\d+)$/.exec(field)?.[1];
            return index === undefined ? [] : [request.amenityIds[Number(index)]];
          });
          const ticked = form.form.getValues('amenityIds');
          form.form.setValue(
            'amenityIds',
            ticked.filter((id) => !gone.includes(id)),
            { shouldDirty: true },
          );
          // The lists this capability's section shows come from another one: their scope.
          void client.invalidateQueries({ queryKey: scope.lists });
        }
        throw error;
      }
    },
    failureTitle: section.failureTitle({ section: copy.spaces.editor.sections.amenities }),
    fieldLines: Object.fromEntries(
      OWN_INDEXES.flatMap((index) => [
        [ownName(index, 'nameAr'), words.fieldErrors.nameAr],
        [ownName(index, 'nameEn'), words.fieldErrors.nameEn],
      ]),
    ),
    failureLines: {
      ...meanwhileLines(place, copy),
      validation: words.unavailable,
    },
  });
  const { control, formState } = form.form;
  const ticked = useController({ control, name: 'amenityIds' });
  const own = useFieldArray({ control, name: 'ownAmenities' });
  const savedKey = JSON.stringify(saved);

  // An unchanged section follows the space as the server answers it.
  useEffect(() => {
    if (!form.form.formState.isDirty) form.form.reset(JSON.parse(savedKey) as AmenitiesValues);
  }, [savedKey, form.form]);

  const unavailableView: FormFailureView = {
    kind: 'refused',
    title: section.failureTitle({ section: copy.spaces.editor.sections.amenities }),
    message: words.unavailable,
  };
  const frame = useSectionFrame({
    place,
    space,
    group: 'amenities',
    form: {
      submit: form.submit,
      isPending: form.isPending,
      blocked: form.blocked,
      failure: form.failure ?? (unavailable ? unavailableView : null),
      isDirty: formState.isDirty,
      discard: () => {
        setUnchanged(false);
        setUnavailable(false);
        form.form.reset(saved);
      },
      unchanged,
    },
    onDirtyChange,
  });

  const checklist: AmenitiesFieldProps = {
    label: words.list,
    value: ticked.field.value,
    linked: space.amenityIds,
    onValueChange: (ids) => {
      ticked.field.onChange(amenityIdsOf(ids));
    },
    disabled: form.isPending,
  };
  const full = own.fields.length >= MAX_OWN_AMENITIES;

  return {
    frame,
    checklist,
    manage: { lead: words.manageLead, label: words.manageLink },
    own: {
      title: words.own,
      hint: words.ownHint,
      rows: own.fields.map((row, index) => ({
        key: row.id,
        nameAr: {
          label: words.nameAr,
          binding: form.field(ownName(index, 'nameAr')),
          error: form.errors[ownName(index, 'nameAr')],
        },
        nameEn: {
          label: words.nameEn,
          optional: copy.spaces.add.optional,
          binding: form.field(ownName(index, 'nameEn')),
          error: form.errors[ownName(index, 'nameEn')],
        },
        remove: {
          label: words.remove({ position: index + 1 }),
          disabled: form.isPending,
          run: () => {
            own.remove(index);
          },
        },
      })),
      add: {
        label: words.add,
        disabled: full || form.isPending,
        reason: full ? words.limit : null,
        run: () => {
          own.append({ nameAr: '', nameEn: '' });
        },
      },
    },
  };
}
