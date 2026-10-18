import { Prisma } from '../generated/prisma/client.ts';

/**
 * Whether `error` is a foreign key violation (Prisma's P2003): a row still referenced, such as a
 * shift a price uses, refused its delete, or a write named a row its key cannot find, such as
 * another space's shift. A repository turns it into what it means; the service answers.
 */
export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
}
