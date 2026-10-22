// The customers list's search term (docs/api/api-contract.md › Customers (managed)): pure, so the
// rule that tells a phone from a name is one.

import { normalisePhone } from '@masaha/shared/core';

/** What `q` searches: one phone, a phone's last digits, or a name. */
export type SearchTerms = { phone: string } | { phoneDigits: string } | { name: string };

/**
 * A whole number, in any form the phone field takes, searches that phone as it is stored (E.164).
 * Else a term of digits only, at least two once a phone's separators (spaces, `+`, `-`, `.`,
 * parentheses) are removed, searches the end of a phone (a customer is told by the last digits of
 * their number); anything else searches the name.
 */
export function searchTermsOf(q: string): SearchTerms {
  const phone = normalisePhone(q);
  if (phone) return { phone };
  const digits = q.replace(/[\s+\-.()]/g, '');
  return /^\d{2,}$/.test(digits) ? { phoneDigits: digits } : { name: q };
}
