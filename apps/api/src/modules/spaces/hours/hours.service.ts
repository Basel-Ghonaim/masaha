import { isDeepStrictEqual } from 'node:util';

import type { AdminSpace, SpaceHours, UpdateSpaceHoursRequest } from '@masaha/shared/spaces';

import type { Tx } from '../../../db/index.ts';
import type { AuditValues } from '../../../shared/audit/index.ts';
import type { Actor, LoadedSpace } from '../../../shared/auth/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import { createGroupEdit, type GroupEditDependencies } from '../facts/groupEdit.ts';
import { createHoursRepository } from './hours.repository.ts';
import { shiftChanges } from './shiftChanges.ts';
import { createShiftsRepository } from './shifts.repository.ts';

/** The hours as an audit entry records them: the whole week and every shift. */
function hoursValues({ days, shifts }: SpaceHours): AuditValues {
  return {
    days: days.map(
      (day) => day && { opensMinute: day.opensMinute, closesMinute: day.closesMinute },
    ),
    shifts: shifts.map((shift) => ({
      id: shift.id,
      nameAr: shift.nameAr,
      nameEn: shift.nameEn,
      startsMinute: shift.startsMinute,
      endsMinute: shift.endsMinute,
    })),
  };
}

/** The request in the hours' own shape, to compare with what is stored. */
function asStored({ days, shifts }: UpdateSpaceHoursRequest) {
  return {
    days,
    shifts: shifts.map((shift) => ({
      id: shift.id,
      nameAr: shift.nameAr,
      nameEn: shift.nameEn ?? null,
      startsMinute: shift.startsMinute,
      endsMinute: shift.endsMinute,
    })),
  };
}

/**
 * The opening hours with the shifts, saved together and whole (decisions F1, F3). Each shift the
 * request names keeps its id; a shift it leaves out is removed, unless something uses it (F5).
 */
export function createHoursService(dependencies: GroupEditDependencies) {
  const editGroup = createGroupEdit(dependencies);
  const hours = createHoursRepository();
  const shifts = createShiftsRepository();

  async function read(spaceId: number, tx: Tx): Promise<SpaceHours> {
    const days = await hours.listFor(spaceId, tx);
    return { days: days ?? [], shifts: await shifts.listFor(spaceId, tx) };
  }

  return {
    /**
     * Replaces the week and the shifts. A save that changes nothing writes nothing, unless the hours
     * were never saved: their first save dates them.
     */
    update(
      actor: Actor,
      space: LoadedSpace,
      request: UpdateSpaceHoursRequest,
    ): Promise<AdminSpace> {
      return editGroup(actor, space, 'hours', 'Edited', async (tx, current) => {
        const before = await read(space.id, tx);
        if (current.hoursUpdatedAt && isDeepStrictEqual(before, asStored(request))) return null;

        const changes = shiftChanges(before.shifts, request.shifts);
        if (changes.unknown.length > 0) {
          throw AppError.validation(
            Object.fromEntries(
              changes.unknown.map((index) => [`shifts.${String(index)}.id`, ['invalid_choice']]),
            ),
          );
        }
        // One statement at a time (finding 11). A shift still in use refuses its removal after the
        // week is written: the transaction takes both back.
        await hours.replace(space.id, request.days, tx);
        if ((await shifts.remove(space.id, changes.remove, tx)) === 'inUse') {
          throw AppError.conflict(undefined, 'A shift the request leaves out is still in use');
        }
        for (const id of changes.rename) await shifts.moveAside(id, tx);
        for (const { id, data } of changes.update) await shifts.update(id, data, tx);
        for (const data of changes.create) await shifts.create(space.id, data, tx);

        return { before: hoursValues(before), after: hoursValues(await read(space.id, tx)) };
      });
    },
  };
}

export type HoursService = ReturnType<typeof createHoursService>;
