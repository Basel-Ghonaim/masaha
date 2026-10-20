import type { DomainErrorCode, ErrorType } from '@masaha/shared/core';

/**
 * The translation table (docs/backend/conventions.md §4): a database constraint's name → the domain
 * error it answers, the way P2002 becomes `NOT_UNIQUE`. The ledger's rules are the database's
 * (§13); the services do not repeat them, and their violations are answered here.
 */
export const CONSTRAINT_CODES: Readonly<
  Partial<Record<string, { type: ErrorType; code: DomainErrorCode }>>
> = {
  payments_within_due: { type: 'conflict', code: 'PAYMENT_EXCEEDS_DUE' },
  payments_visit_uncharged: { type: 'conflict', code: 'VISIT_NOT_PRICED' },
  payments_visit_written_off: { type: 'conflict', code: 'VISIT_WRITTEN_OFF' },
};
