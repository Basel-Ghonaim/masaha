import type { Prisma, PrismaClient } from '../generated/prisma/client.ts';
import { prisma } from './prisma.ts';

/** A transaction's client. Repository functions take it as their optional last argument. */
export type Tx = Prisma.TransactionClient;

/** Runs `work` in one transaction (docs/backend/conventions.md §8): all of it commits, or none. */
export type RunInTransaction = <T>(work: (tx: Tx) => Promise<T>) => Promise<T>;

/** The one way to open a transaction. An orchestrator receives it by injection. */
export function createRunInTransaction(db: PrismaClient = prisma): RunInTransaction {
  return (work) => db.$transaction(work);
}
