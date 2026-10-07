import { isDeepStrictEqual } from 'node:util';

import type { AdminSpace, Contact, UpdateSpaceContactsRequest } from '@masaha/shared/spaces';

import type { AuditValues } from '../../../shared/audit/index.ts';
import type { Actor, LoadedSpace } from '../../../shared/auth/index.ts';
import { createGroupEdit, type GroupEditDependencies } from '../facts/groupEdit.ts';
import { createContactsRepository } from './contacts.repository.ts';

/** The contacts as an audit entry records them: the whole list. */
function contactsValues(contacts: readonly Contact[]): AuditValues {
  return { contacts: contacts.map(({ type, value }) => ({ type, value })) };
}

/**
 * The space's contacts, saved whole (decision F1). Each arrives validated and in its type's one
 * stored form, from the shared rules (decision F6).
 */
export function createContactsService(dependencies: GroupEditDependencies) {
  const editGroup = createGroupEdit(dependencies);
  const contacts = createContactsRepository();

  return {
    /** Replaces the contacts. A save that changes nothing writes nothing, unless never saved. */
    update(
      actor: Actor,
      space: LoadedSpace,
      request: UpdateSpaceContactsRequest,
    ): Promise<AdminSpace> {
      return editGroup(actor, space, 'contacts', 'Edited', async (tx, current) => {
        const before = await contacts.listFor(space.id, tx);
        const next = request.contacts.map(({ type, value }) => ({ type, value }));
        if (current.contactsUpdatedAt && isDeepStrictEqual(before, next)) return null;

        await contacts.replace(space.id, next, tx);
        return { before: contactsValues(before), after: contactsValues(next) };
      });
    },
  };
}

export type ContactsService = ReturnType<typeof createContactsService>;
