// The customers list's search term (docs/api/api-contract.md › Customers (managed)): pure, so the
// rule that tells a phone from a name is one.

/** What `q` searches: a phone's last digits, or a name. */
export type SearchTerms = { phoneDigits: string } | { name: string };

/**
 * A term of digits only, at least two once spaces and a plus are removed, searches the end of a
 * phone (a customer is told by the last digits of their number); anything else searches the name.
 */
export function searchTermsOf(q: string): SearchTerms {
  const digits = q.replace(/[\s+]/g, '');
  return /^\d{2,}$/.test(digits) ? { phoneDigits: digits } : { name: q };
}
