import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';

import type { Actor, LoadedSpace } from '../../../shared/auth/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import { createGroupEdit, DATE_COLUMNS, type GroupEditDependencies } from '../facts/groupEdit.ts';

/**
 * «المعلومات ما زالت صحيحة»: a fact group confirmed unchanged. Its date is renewed and nothing
 * else changes (data-model › Freshness). A group never saved has nothing to confirm: it is saved
 * first, even empty.
 */
export function createConfirmService(dependencies: GroupEditDependencies) {
  const editGroup = createGroupEdit(dependencies);
  return {
    confirm(actor: Actor, space: LoadedSpace, group: FactGroup): Promise<AdminSpace> {
      const column = DATE_COLUMNS[group];
      return editGroup(actor, space, group, 'Confirmed', (_tx, current, at) => {
        const date = current[column];
        if (!date) {
          throw AppError.conflict(undefined, `The ${group} were never saved: nothing to confirm`);
        }
        return Promise.resolve({
          before: { [column]: date.toISOString() },
          after: { [column]: at.toISOString() },
        });
      });
    },
  };
}

export type ConfirmService = ReturnType<typeof createConfirmService>;
