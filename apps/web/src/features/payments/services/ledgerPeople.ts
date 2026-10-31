import type { LedgerPerson } from '../types/LedgerPerson';

/**
 * Whom the ledger's staff filter names, in its order (D8.7): the owner signed in (`self`), then the
 * space's other owners, each marked so (finding 166), then its reception accounts, a deactivated one
 * kept. Someone named twice is named once, first where they come.
 */
export function ledgerPeople({
  self,
  owners,
  reception,
}: {
  self: { id: number; name: string } | null;
  owners: readonly { id: number; name: string }[];
  reception: readonly { id: number; name: string; active: boolean }[];
}): LedgerPerson[] {
  const people: LedgerPerson[] = [
    ...(self === null ? [] : [{ ...self, self: true, active: true }]),
    ...owners.map(({ id, name }) => ({ id, name, self: false, active: true, owner: true })),
    ...reception.map(({ id, name, active }) => ({ id, name, self: false, active })),
  ];
  return people.filter((person, index) => people.findIndex(({ id }) => id === person.id) === index);
}
