import type { Customer } from '@masaha/shared/customers';

/**
 * Where the subscription sheet opens, with what its entry knows: a new customer (a typed name or
 * phone, from the desk's search), or a known customer's new subscription, with what they owe as the
 * entry read it (their file, read when the sheet opens, says it again).
 */
export type SheetEntry =
  | { mode: 'new'; name?: string; phone?: string }
  | { mode: 'subscribe'; customer: Customer & { debtAgorot: number } };
