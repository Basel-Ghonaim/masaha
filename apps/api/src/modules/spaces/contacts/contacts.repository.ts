import type { Contact } from '@masaha/shared/spaces';

import { prisma, type Tx } from '../../../db/index.ts';

/** A space's contacts. */
export function createContactsRepository() {
  return {
    /** In the order they are shown in. */
    listFor(spaceId: number, tx: Tx = prisma): Promise<Contact[]> {
      return tx.spaceContact.findMany({
        where: { spaceId },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        select: { type: true, value: true },
      });
    },

    /**
     * Replaces the contacts, in their order, one statement at a time (finding 11). Nothing refers
     * to a contact, so they are written anew.
     */
    async replace(spaceId: number, contacts: readonly Contact[], tx: Tx): Promise<void> {
      await tx.spaceContact.deleteMany({ where: { spaceId } });
      for (const [sortOrder, { type, value }] of contacts.entries()) {
        await tx.spaceContact.create({
          data: { spaceId, type, value, sortOrder },
          select: { id: true },
        });
      }
    },
  };
}
