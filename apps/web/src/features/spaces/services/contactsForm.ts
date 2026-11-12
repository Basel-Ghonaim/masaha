import type { AdminSpace, ContactType } from '@masaha/shared/spaces';

/**
 * The contacts as their Sheet holds them: each value as typed, and «وسيلة أخرى»'s own name as typed
 * (`''` while a row of that kind has none yet), `null` on every other type.
 */
export type ContactsValues = {
  contacts: { type: ContactType; value: string; label: string | null }[];
};

/** A new contact: a WhatsApp number to type (C2). */
export const NEW_CONTACT: ContactsValues['contacts'][number] = {
  type: 'WHATSAPP',
  value: '',
  label: null,
};

/**
 * A space's contacts as the Sheet holds them; with none, one new WhatsApp row to fill in, which
 * opening the Sheet does not count as a change.
 */
export function contactsValues(space: Pick<AdminSpace, 'contacts'>): ContactsValues {
  if (space.contacts.length === 0) return { contacts: [{ ...NEW_CONTACT }] };
  return { contacts: space.contacts.map(({ type, value, label }) => ({ type, value, label })) };
}

/**
 * A row's name as its type is changed: a row turned into «وسيلة أخرى» takes a name to type, keeping
 * the one it had; one that leaves it drops its name, which no other type may hold (F5 of #140's
 * review).
 */
export function labelFor(type: ContactType, label: string | null): string | null {
  return type === 'OTHER' ? (label ?? '') : null;
}

/** The contacts the contract's schema reads: «وسيلة أخرى»'s name as typed, every other's none. */
export function contactsInput(values: ContactsValues): Record<string, unknown> {
  return {
    contacts: values.contacts.map(({ type, value, label }) => ({
      type,
      value,
      label: type === 'OTHER' ? (label ?? '') : null,
    })),
  };
}
