import { Prisma } from '../generated/prisma/client.ts';

/**
 * Whether `error` is a unique violation of the constraint named `constraint` (Prisma's P2002, which
 * names it in its meta). A repository turns it into what is taken; the service answers the 409.
 */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    JSON.stringify(error.meta ?? {}).includes(constraint)
  );
}
