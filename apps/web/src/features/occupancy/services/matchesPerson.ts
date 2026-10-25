import type { PresentPerson } from '@masaha/shared/occupancy';

/** A phone's separators, removed before its digits are compared, as the customers search does. */
const SEPARATORS = /[\s+\-.()]/g;
/** The fewest digits that search a phone (docs/api/api-contract.md › `GET …/customers`). */
const DIGITS = /^\d{2,}$/;

/**
 * Whether a person present answers the desk's search: a part of their name, whatever its case, or
 * — two digits or more once a phone's separators are removed — the end of the phone of a check-in's
 * customer (`phones`, by customer id, from the open check-ins). A visit carries no phone, so digits
 * never find one. An empty term matches no one.
 */
export function matchesPerson(
  person: PresentPerson,
  term: string,
  phones: ReadonlyMap<number, string>,
): boolean {
  const text = term.trim().toLowerCase();
  if (text === '') return false;
  if (person.name.toLowerCase().includes(text)) return true;
  const digits = text.replace(SEPARATORS, '');
  if (person.kind !== 'CHECK_IN' || !DIGITS.test(digits)) return false;
  return phones.get(person.customerId)?.endsWith(digits) ?? false;
}
