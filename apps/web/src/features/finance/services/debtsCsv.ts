import type { BalanceRow } from '@masaha/shared/finance';
import { csvOf } from '@shared/lib';
import { shekelsText } from './shekels';

/** The debts CSV's words, in the interface's language. */
type DebtsCsvWords = {
  name: string;
  phone: string;
  amount: string;
  since: string;
  oldest: string;
  archived: string;
  yes: string;
  items: { VISIT: string; SUBSCRIPTION: string };
};

/**
 * The debts' CSV (D5.4): `masaha-debts-{today}.csv`, a row per customer who owes — the name, the
 * phone as stored, the amount in shekels with a dot, the oldest item's day and name, and «نعم» when
 * archived. The phones leave the device only by the owner's own download (the owner's decision 5).
 */
export function debtsCsv(rows: readonly BalanceRow[], today: string, words: DebtsCsvWords) {
  return {
    name: `masaha-debts-${today}.csv`,
    text: csvOf(
      [words.name, words.phone, words.amount, words.since, words.oldest, words.archived],
      rows.map(({ customer, amountAgorot, oldestItem }) => [
        customer.name,
        customer.phone,
        shekelsText(amountAgorot),
        oldestItem?.since ?? null,
        oldestItem === null ? null : (oldestItem.name ?? words.items[oldestItem.kind]),
        customer.archived ? words.yes : null,
      ]),
    ),
  };
}
