import { Prisma } from '../generated/prisma/client.ts';

/**
 * Whether `error` is a foreign key violation (Prisma's P2003): a row still referenced, such as a
 * shift a price uses, refused its delete. A repository turns it into what is in use; the service
 * answers the 409.
 */
export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
}
