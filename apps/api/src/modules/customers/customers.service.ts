import type { Tx } from '../../db/index.ts';
import { createCustomersRepository } from './customers.repository.ts';

/** A space's customers (docs/backend/conventions.md §7). So far the names the desk shows. */
export function createCustomersService() {
  const repository = createCustomersRepository();
  return {
    /** The names of these customers of the space, by id, in one query. */
    namesOf(spaceId: number, ids: readonly number[], tx?: Tx): Promise<Map<number, string>> {
      return repository.namesOf(spaceId, ids, tx);
    },
  };
}

export type CustomersService = ReturnType<typeof createCustomersService>;
