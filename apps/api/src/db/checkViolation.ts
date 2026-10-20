import { Prisma } from '../generated/prisma/client.ts';

/** PostgreSQL's SQLSTATE for a check violation, which the ledger's triggers raise too. */
const CHECK_VIOLATION = '23514';

/**
 * The constraint a check violation names, or `null` when `error` is none. Through the driver
 * adapter, Prisma reports it as P2039 with the database's own code and message, and no constraint
 * field: a trigger names its constraint at the start of its message (`payments_within_due: …`), a
 * `CHECK` in PostgreSQL's words (`… violates check constraint "visits_charge_check"`).
 */
export function checkViolationOf(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;
  const cause = (
    error.meta as
      | { driverAdapterError?: { cause?: { originalCode?: unknown; originalMessage?: unknown } } }
      | undefined
  )?.driverAdapterError?.cause;
  if (cause?.originalCode !== CHECK_VIOLATION || typeof cause.originalMessage !== 'string') {
    return null;
  }
  const message = cause.originalMessage;
  return (
    /^([a-z0-9_]+): /.exec(message)?.[1] ??
    /violates check constraint "([^"]+)"/.exec(message)?.[1] ??
    null
  );
}
