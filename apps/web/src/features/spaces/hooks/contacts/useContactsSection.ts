import {
  CONTACT_TYPES,
  MAX_CONTACTS,
  normaliseContact,
  updateSpaceContactsSchema,
  type AdminSpace,
  type ContactType,
  type FactGroup,
  type UpdateSpaceContactsRequest,
} from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { isolated, useServerForm } from '@shared/forms';
import { useEffect, useState } from 'react';
import { useFieldArray, useWatch, type Path } from 'react-hook-form';
import type { EditorPlace } from '../../types/EditorPlace';
import { carrierOf } from '../../services/carrierOf';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { meanwhileLines } from '../editor/meanwhileLines';
import { useSaveGroup } from '../editor/useSaveGroup';
import { useSectionFrame } from '../editor/useSectionFrame';

/** The contacts as their form holds them: each value as typed. */
type ContactsValues = { contacts: { type: ContactType; value: string }[] };

const contactsValues = (space: Pick<AdminSpace, 'contacts'>): ContactsValues => ({
  contacts: space.contacts.map(({ type, value }) => ({ type, value })),
});

// The fields in the order the section shows them: a refusal focuses the first it names.
/** A contact's field, by its row. */
const contactField = (index: number, name: 'type' | 'value') =>
  `contacts.${String(index)}.${name}` as `contacts.${number}.${typeof name}`;

const FIELDS: Path<ContactsValues>[] = Array.from({ length: MAX_CONTACTS }, (_, index) =>
  contactField(index, 'value'),
);

/** The type a new contact starts as. */
const NEW_TYPE: ContactType = 'WHATSAPP';

/**
 * The editor's «التواصل» section, ready to render: the contacts, up to the contract's twenty, each
 * of the contract's seven types, its value's helper showing the form it is stored in as it is typed
 * (the shared rule's), or an example while it holds none, and a phone's carrier beside it. A value
 * that cannot be stored, or a repeat once stored, is refused on its own row before anything is sent.
 */
export function useContactsSection({
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
  const words = copy.spaces.editor.contacts;
  const section = copy.spaces.editor.section;
  const save = useSaveGroup(place, space.id, 'contacts', (request: UpdateSpaceContactsRequest) =>
    repository.updateContacts(space.id, request),
  );
  const [unchanged, setUnchanged] = useState(false);
  const saved = contactsValues(space);
  const missing = space.updatedAt.contacts === null;
  const form = useServerForm<ContactsValues, UpdateSpaceContactsRequest>({
    schema: updateSpaceContactsSchema,
    defaultValues: saved,
    fields: FIELDS,
    submit: async (request) => {
      if (!missing && JSON.stringify(request.contacts) === JSON.stringify(space.contacts)) {
        setUnchanged(true);
        form.form.reset(saved);
        return;
      }
      setUnchanged(false);
      const answer = await save.mutateAsync(request);
      form.form.reset(contactsValues(answer));
    },
    failureTitle: section.failureTitle({ section: copy.spaces.editor.sections.contacts }),
    failureLines: meanwhileLines(place, copy),
  });
  const { control, formState, setValue } = form.form;
  const list = useFieldArray({ control, name: 'contacts' });
  const typed = useWatch({ control, name: 'contacts' });
  const savedKey = JSON.stringify(saved);

  // An unchanged section follows the space as the server answers it.
  useEffect(() => {
    if (!form.form.formState.isDirty) form.form.reset(JSON.parse(savedKey) as ContactsValues);
  }, [savedKey, form.form]);

  const frame = useSectionFrame({
    place,
    space,
    group: 'contacts',
    form: {
      submit: form.submit,
      isPending: form.isPending,
      blocked: form.blocked,
      failure: form.failure,
      isDirty: formState.isDirty,
      discard: () => {
        setUnchanged(false);
        form.form.reset(saved);
      },
      unchanged,
    },
    onDirtyChange,
  });

  /** A row's error, worded for its type: what it holds is empty, not of its type, or repeated. */
  const errorOf = (index: number, type: ContactType, value: string) => {
    const code = form.codes[contactField(index, 'value')];
    if (code === undefined) return undefined;
    const lines = words.fieldErrors;
    if (code === 'not_unique') return lines.not_unique;
    if (code === 'too_long') return lines.too_long;
    if (value.trim() === '') return lines.empty;
    if (type === 'PHONE' || type === 'WHATSAPP') return lines.phone;
    return type === 'EMAIL' ? lines.email : lines.link;
  };
  const full = list.fields.length >= MAX_CONTACTS;

  return {
    frame,
    rows: list.fields.map((row, index) => {
      const type = typed[index]?.type ?? row.type;
      const value = typed[index]?.value ?? row.value;
      const stored = value.trim() === '' ? null : normaliseContact(type, value);
      const carrier = type === 'PHONE' && stored !== null ? carrierOf(stored) : null;
      return {
        key: row.id,
        type: {
          label: words.type,
          value: type,
          options: CONTACT_TYPES.map((option) => ({ value: option, label: words.types[option] })),
          disabled: form.isPending,
          choose: (option: string) => {
            setValue(contactField(index, 'type'), option as ContactType, { shouldDirty: true });
            // Once the section was sent, the row's value is checked again for the type chosen.
            if (formState.isSubmitted) void form.form.trigger(contactField(index, 'value'));
          },
        },
        value: {
          label: words.value,
          binding: form.field(contactField(index, 'value')),
          helper:
            stored === null
              ? words.example({ value: isolated(words.examples[type]) })
              : words.storedAs({ value: isolated(stored) }),
          carrier: carrier === null ? null : words.carriers[carrier],
          error: errorOf(index, type, value),
        },
        remove: {
          label: words.remove({ position: index + 1 }),
          disabled: form.isPending,
          run: () => {
            list.remove(index);
          },
        },
      };
    }),
    add: {
      label: words.add,
      disabled: full || form.isPending,
      reason: full ? words.limit : null,
      run: () => {
        list.append({ type: NEW_TYPE, value: '' });
      },
    },
  };
}
