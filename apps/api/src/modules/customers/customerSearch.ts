// The customers list's search term (docs/api/api-contract.md › Customers (managed)): pure, so the
// rule that tells a phone from a name is one.

import { normalisePhone } from '@masaha/shared/core';

/**
 * What `q` searches: one phone, whole or by its national digits at a phone's end; a phone's last
 * digits; or a name.
 */
export type SearchTerms =
  { phone: string; phoneDigits: string } | { phoneDigits: string } | { name: string };

/**
 * A whole number, in any form the phone field takes, searches that phone as it is stored (E.164),
 * or its national digits with the trunk 0 at the end of a phone, so a number stored under the other
 * country code (`+970521234567`, typed `0521234567`) is still found. Else a term of digits only, at
 * least two once a phone's separators (spaces, `+`, `-`, `.`, parentheses) are removed, searches the
 * end of a phone (a customer is told by the last digits of their number); anything else searches
 * the name.
 */
export function searchTermsOf(q: string): SearchTerms {
  const phone = normalisePhone(q);
  // E.164 here is `+970` or `+972`, then the national digits.
  if (phone) return { phone, phoneDigits: `0${phone.slice(4)}` };
  const digits = q.replace(/[\s+\-.()]/g, '');
  return /^\d{2,}$/.test(digits) ? { phoneDigits: digits } : { name: q };
}
