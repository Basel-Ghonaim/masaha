import {
  CONTACT_TYPES,
  MAX_CONTACTS,
  normaliseContact,
  updateSpaceContactsSchema,
  type ContactType,
  type UpdateSpaceContactsRequest,
} from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { toast } from '@shared/design-system';
import { isolated, useServerForm } from '@shared/forms';
import { carrierOf } from '@shared/lib';
import { useFieldArray, useWatch, type Path } from 'react-hook-form';
import {
  NEW_CONTACT,
  contactsInput,
  contactsValues,
  labelFor,
  type ContactsValues,
} from '../../services/contactsForm';
import type { SectionHost } from '../../types/SectionHost';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { meanwhileLines } from '../editor/meanwhileLines';
import { sectionName } from '../editor/sectionName';
import { useResetOnOpen } from '../editor/useResetOnOpen';
import { useSaveGroup } from '../editor/useSaveGroup';
import { useSheetFrame } from '../editor/useSheetFrame';

/** A contact's field, by its row. */
const contactField = (index: number, name: 'type' | 'value' | 'label') =>
  `contacts.${String(index)}.${name}` as `contacts.${number}.${typeof name}`;

// The fields in the order the Sheet shows them: a refusal focuses the first it names.
const FIELDS: Path<ContactsValues>[] = Array.from({ length: MAX_CONTACTS }, (_, index) => [
  contactField(index, 'label'),
  contactField(index, 'value'),
]).flat();

/**
 * «التواصل»'s Sheet, ready to render (C2, M4): a row per contact, in the order visitors see them —
 * its type, of the twelve, from a list with icons; «اسم الوسيلة» for «وسيلة أخرى» («مثلًا: ديسكورد»);
 * its value, with its type's placeholder, the form it is saved in once it differs from what was typed,
 * and a phone's carrier — up to twenty, a new row a WhatsApp number. A value its type cannot store is
 * refused on its row in its type's words, a repeat says «هذه الوسيلة مضافة من قبل», and «وسيلة أخرى»
 * without a name «اكتب اسم الوسيلة», all before anything is sent. A row that leaves «وسيلة أخرى» drops
 * its name. The rows are ordered by dragging their handle, the keyboard included, the first shown first
 * to visitors; that order is the order saved; contacts as saved send nothing.
 */
export function useContactsSheet(host: SectionHost) {
  const copy = useCopy();
  const words = copy.spaces.editor.contacts;
  const { place, space } = host;
  const sheet = host.sheet('contacts');
  const { repository } = EDITOR_SCOPES[place];
  const save = useSaveGroup(place, space.id, 'contacts', (request: UpdateSpaceContactsRequest) =>
    repository.updateContacts(space.id, request),
  );
  const form = useServerForm<ContactsValues, UpdateSpaceContactsRequest>({
    schema: updateSpaceContactsSchema,
    defaultValues: contactsValues(space),
    fields: FIELDS,
    prepare: contactsInput,
    submit: async (request) => {
      if (
        space.updatedAt.contacts !== null &&
        JSON.stringify(request.contacts) === JSON.stringify(space.contacts)
      ) {
        toast(copy.spaces.editor.section.unchanged);
        sheet.close();
        return;
      }
      await save.mutateAsync(request);
      sheet.close();
    },
    failureTitle: copy.spaces.editor.section.failureTitle({
      section: sectionName('contacts', copy),
    }),
    fieldLines: Object.fromEntries(
      Array.from({ length: MAX_CONTACTS }, (_, index) => [
        contactField(index, 'label'),
        words.fieldErrors.label,
      ]),
    ),
    failureLines: meanwhileLines(place, copy),
  });
  useResetOnOpen(sheet.open, () => {
    form.form.reset(contactsValues(space));
  });
  const frame = useSheetFrame({
    host: sheet,
    title: words.sheetTitle,
    description: words.sheetDescription,
    form: {
      submit: form.submit,
      isPending: form.isPending,
      blocked: form.blocked,
      failure: form.failure,
      isDirty: form.form.formState.isDirty,
    },
  });
  const { control, formState, setValue, getValues } = form.form;
  const list = useFieldArray({ control, name: 'contacts' });
  const typed = useWatch({ control, name: 'contacts' });

  /** A row's value's error, worded for its type: empty, not of its type, too long or repeated. */
  const errorOf = (index: number, type: ContactType, value: string) => {
    const code = form.codes[contactField(index, 'value')];
    if (code === undefined) return undefined;
    const lines = words.fieldErrors;
    if (code === 'not_unique') return lines.not_unique;
    if (code === 'too_long') return lines.too_long;
    if (value.trim() === '') return lines.empty;
    return lines.invalid[type];
  };
  const full = list.fields.length >= MAX_CONTACTS;

  return {
    frame,
    list: list.fields.map((row, index) => {
      const contact = typed[index] ?? row;
      const { type, value } = contact;
      const stored = value.trim() === '' ? null : normaliseContact(type, value);
      const carrier = type === 'PHONE' && stored !== null ? carrierOf(stored) : null;
      const other = type === 'OTHER';
      const name =
        other && (contact.label ?? '').trim() !== '' ? (contact.label ?? '') : words.types[type];
      return {
        key: row.id,
        name,
        handle: words.handle({ name }),
        type: {
          label: words.type,
          value: type,
          options: CONTACT_TYPES.map((option) => ({ value: option, label: words.types[option] })),
          disabled: form.isPending,
          choose: (option: string) => {
            const next = option as ContactType;
            setValue(contactField(index, 'type'), next, { shouldDirty: true });
            setValue(
              contactField(index, 'label'),
              labelFor(next, getValues(contactField(index, 'label'))),
              {
                shouldDirty: true,
              },
            );
            // Once the Sheet was sent, the row is checked again for the type chosen.
            if (formState.isSubmitted) {
              void form.form.trigger([contactField(index, 'value'), contactField(index, 'label')]);
            }
          },
        },
        label: other
          ? {
              label: words.label,
              placeholder: words.labelPlaceholder,
              binding: form.field(contactField(index, 'label')),
              error: form.errors[contactField(index, 'label')],
            }
          : null,
        value: {
          label: other ? words.otherValue : words.types[type],
          placeholder: words.placeholders[type],
          binding: form.field(contactField(index, 'value')),
          // The form it is saved in, once it differs from what was typed.
          helper:
            stored === null || stored === value.trim()
              ? undefined
              : words.storedAs({ value: isolated(stored) }),
          carrier: carrier === null ? null : words.carriers[carrier],
          error: errorOf(index, type, value),
        },
        remove: {
          label: words.remove({ name }),
          disabled: form.isPending,
          run: () => {
            list.remove(index);
          },
        },
      };
    }),
    /** The rows' order, by dragging (C2): only the Sheet's draft moves; «حفظ» saves it. */
    order:
      list.fields.length > 1
        ? {
            label: words.list,
            hint: words.hint,
            words: words.sort,
            move: (next: string[], moved: string) => {
              const from = list.fields.findIndex(({ id }) => id === moved);
              const to = next.indexOf(moved);
              if (from >= 0 && to >= 0) list.move(from, to);
            },
          }
        : null,
    add: {
      label: words.add,
      disabled: full || form.isPending,
      reason: full ? words.limit : null,
      run: () => {
        list.append({ ...NEW_CONTACT });
      },
    },
  };
}

export type ContactsSheetView = ReturnType<typeof useContactsSheet>;
