import {
  MAX_OWN_AMENITIES,
  updateSpaceAmenitiesSchema,
  type UpdateSpaceAmenitiesRequest,
} from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { toAppError } from '@shared/errors';
import { useServerForm, type FormFailureView } from '@shared/forms';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useController, useFieldArray, useWatch, type Path } from 'react-hook-form';
import { useNavigate } from 'react-router';
import {
  amenitiesInput,
  amenitiesValues,
  amenityIdsOf,
  catalogueClashes,
  sameAmenities,
  type AmenitiesValues,
} from '../../services/amenitiesForm';
import type { AmenitiesFieldProps } from '../../types/AmenitiesField';
import type { AmenityCatalogue } from '../../types/AmenityCatalogue';
import type { SectionHost } from '../../types/SectionHost';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { meanwhileLines } from '../editor/meanwhileLines';
import { sectionName } from '../editor/sectionName';
import { useResetOnOpen } from '../editor/useResetOnOpen';
import { useSaveGroup } from '../editor/useSaveGroup';
import { useSheetFrame } from '../editor/useSheetFrame';

const OWN_INDEXES = Array.from({ length: MAX_OWN_AMENITIES }, (_, index) => index);

/** An own amenity's name field, by its row. */
const ownName = (index: number, name: 'nameAr' | 'nameEn') =>
  `ownAmenities.${String(index)}.${name}` as `ownAmenities.${number}.${typeof name}`;

// The fields in the order the Sheet shows them: a refusal focuses the first it names.
const FIELDS: Path<AmenitiesValues>[] = [
  'amenityIds',
  ...OWN_INDEXES.flatMap((index) => [ownName(index, 'nameAr'), ownName(index, 'nameEn')]),
];

/**
 * «المرافق»'s Sheet, ready to render (A2): the platform's amenities to tick, in the checklist the page
 * hands in, a retired one the space still holds listed and marked until unticked; then «مرافق أخرى»,
 * a row each — the Arabic name, the English optional — up to twenty. A row naming one of the
 * amenities the checklist offers — an active one, or a retired one the space holds — in either
 * language, is refused in the browser («هذا المرفق موجود في القائمة، اختره من فوق»), never sent; the
 * server refuses none (S4). On the admin's page, the way to the
 * platform's list, asking first when the Sheet has changes. An amenity ticked that the server no
 * longer offers is taken out of the choice at once, said in the Sheet, and the lists fetched again.
 */
export function useAmenitiesSheet(
  host: SectionHost,
  catalogue: AmenityCatalogue,
  listLink: string | null,
) {
  const copy = useCopy();
  const words = copy.spaces.editor.amenities;
  const { place, space } = host;
  const sheet = host.sheet('amenities');
  const scope = EDITOR_SCOPES[place];
  const client = useQueryClient();
  const navigate = useNavigate();
  const title = sectionName('amenities', copy);
  // An amenity ticked that the server refused (422 on `amenityIds`), retired meanwhile.
  const [unavailable, setUnavailable] = useState(false);
  // What the checklist offers: the active amenities, and a retired one only while the space holds it.
  const offered = (catalogue.entries ?? []).filter(
    ({ id, isActive }) => isActive || space.amenityIds.includes(id),
  );
  const save = useSaveGroup(place, space.id, 'amenities', (request: UpdateSpaceAmenitiesRequest) =>
    scope.repository.updateAmenities(space.id, request),
  );
  const form = useServerForm<AmenitiesValues, UpdateSpaceAmenitiesRequest>({
    schema: updateSpaceAmenitiesSchema,
    defaultValues: amenitiesValues(space),
    fields: FIELDS,
    prepare: amenitiesInput,
    submit: async (request) => {
      setUnavailable(false);
      const [clash] = catalogueClashes(request.ownAmenities.map(own), offered);
      if (clash !== undefined) {
        form.form.setFocus(ownName(clash, 'nameAr'));
        return;
      }
      if (space.updatedAt.amenities !== null && sameAmenities(request, space)) {
        toast(copy.spaces.editor.section.unchanged);
        sheet.close();
        return;
      }
      try {
        await save.mutateAsync(request);
        sheet.close();
      } catch (error) {
        const refused = Object.keys(toAppError(error).errors ?? {});
        if (refused.some((field) => field.startsWith('amenityIds'))) {
          setUnavailable(true);
          // Unseen once the lists arrive again, it could not be unticked: it is taken out now.
          const gone = refused.flatMap((field) => {
            const index = /^amenityIds\.(\d+)$/.exec(field)?.[1];
            return index === undefined ? [] : [request.amenityIds[Number(index)]];
          });
          form.form.setValue(
            'amenityIds',
            form.form.getValues('amenityIds').filter((id) => !gone.includes(id)),
            { shouldDirty: true },
          );
          // The lists this capability's Sheet shows come from another one: their scope.
          void client.invalidateQueries({ queryKey: scope.lists });
        }
        throw error;
      }
    },
    failureTitle: copy.spaces.editor.section.failureTitle({ section: title }),
    fieldLines: Object.fromEntries(
      OWN_INDEXES.flatMap((index) => [
        [ownName(index, 'nameAr'), words.fieldErrors.nameAr],
        [ownName(index, 'nameEn'), words.fieldErrors.nameEn],
      ]),
    ),
    failureLines: { ...meanwhileLines(place, copy), validation: words.unavailable },
  });
  useResetOnOpen(sheet.open, () => {
    setUnavailable(false);
    form.form.reset(amenitiesValues(space));
  });
  const unavailableView: FormFailureView = {
    kind: 'refused',
    title: copy.spaces.editor.section.failureTitle({ section: title }),
    message: words.unavailable,
  };
  const frame = useSheetFrame({
    host: sheet,
    title: words.sheetTitle,
    description: null,
    form: {
      submit: form.submit,
      isPending: form.isPending,
      blocked: form.blocked,
      failure: form.failure ?? (unavailable ? unavailableView : null),
      isDirty: form.form.formState.isDirty,
    },
  });
  const { control, formState } = form.form;
  const ticked = useController({ control, name: 'amenityIds' });
  const owns = useFieldArray({ control, name: 'ownAmenities' });
  const typed = useWatch({ control, name: 'ownAmenities' });
  // Said once the Sheet was sent, and from then on as the names change.
  const clashes = formState.isSubmitted ? catalogueClashes(typed, offered) : [];

  const checklist: AmenitiesFieldProps = {
    label: words.list,
    value: ticked.field.value,
    linked: space.amenityIds,
    retired: space.retiredAmenities,
    onValueChange: (ids) => {
      ticked.field.onChange(amenityIdsOf(ids));
    },
    disabled: form.isPending,
  };
  const full = owns.fields.length >= MAX_OWN_AMENITIES;

  return {
    frame,
    checklist,
    manage:
      listLink === null
        ? null
        : {
            lead: words.manageLead,
            label: words.manageLink,
            href: listLink,
            run: () => {
              frame.leave(() => {
                void navigate(listLink);
              });
            },
          },
    own: {
      title: words.own,
      hint: words.ownHint,
      rows: owns.fields.map((row, index) => ({
        key: row.id,
        nameAr: {
          label: words.nameAr,
          binding: form.field(ownName(index, 'nameAr')),
          error: clashes.includes(index)
            ? words.inCatalogue
            : form.errors[ownName(index, 'nameAr')],
        },
        nameEn: {
          label: words.nameEn,
          optional: copy.spaces.editor.section.optional,
          binding: form.field(ownName(index, 'nameEn')),
          error: form.errors[ownName(index, 'nameEn')],
        },
        remove: {
          label: words.remove({ position: index + 1 }),
          disabled: form.isPending,
          run: () => {
            owns.remove(index);
          },
        },
      })),
      add: {
        label: words.add,
        disabled: full || form.isPending,
        reason: full ? words.limit : null,
        run: () => {
          owns.append({ nameAr: '', nameEn: '' });
        },
      },
    },
  };
}

/** An own amenity as the catalogue's check reads it: both names, none as blank. */
function own(amenity: { nameAr: string; nameEn?: string | null }) {
  return { nameAr: amenity.nameAr, nameEn: amenity.nameEn ?? '' };
}

export type AmenitiesSheetView = ReturnType<typeof useAmenitiesSheet>;
