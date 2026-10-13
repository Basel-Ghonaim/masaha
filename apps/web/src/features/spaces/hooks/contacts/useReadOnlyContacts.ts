import type { AdminSpace } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { carrierOf } from '../../services/carrierOf';

/** A verified space's contacts to read: each by its type, its value as stored, a phone's carrier. */
export function useReadOnlyContacts(space: AdminSpace) {
  const copy = useCopy();
  const words = copy.spaces.editor.contacts;
  return {
    title: copy.spaces.editor.sections.contacts,
    none: words.none,
    contacts: space.contacts.map((contact, index) => {
      const carrier = contact.type === 'PHONE' ? carrierOf(contact.value) : null;
      return {
        key: `${String(index)} ${contact.type} ${contact.value}`,
        label: words.types[contact.type],
        value: contact.value,
        carrier: carrier === null ? null : words.carriers[carrier],
      };
    }),
  };
}
