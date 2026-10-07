// How a save of the hours changes the space's shifts (decision F5): a shift the request names by
// its id is updated in place and keeps its id, which packages, subscriptions and visits reference;
// a shift without an id is new; a stored shift the request leaves out is removed, which the database
// refuses while anything uses it. Never delete-and-recreate.

/** A shift as it is stored. */
export interface StoredShift {
  id: number;
  nameAr: string;
  nameEn: string | null;
  startsMinute: number;
  endsMinute: number;
}

/** A shift as a save asks for it: with the id of a stored one, or new. */
export interface RequestedShift {
  id?: number;
  nameAr: string;
  nameEn?: string | null;
  startsMinute: number;
  endsMinute: number;
}

/** What a shift's row is written with; `sortOrder` is its place in the request. */
export interface ShiftData {
  nameAr: string;
  nameEn: string | null;
  startsMinute: number;
  endsMinute: number;
  sortOrder: number;
}

export interface ShiftChanges {
  /** The positions in the request of ids that are not the space's shifts. */
  unknown: number[];
  /** The ids of the stored shifts the request leaves out. */
  remove: number[];
  /**
   * The ids of kept shifts whose Arabic name changes. Each is renamed out of the way first, so
   * names can move between shifts without two holding one name at once.
   */
  rename: number[];
  update: { id: number; data: ShiftData }[];
  create: ShiftData[];
}

export function shiftChanges(
  stored: readonly StoredShift[],
  requested: readonly RequestedShift[],
): ShiftChanges {
  const byId = new Map(stored.map((shift) => [shift.id, shift]));
  const kept = new Set<number>();
  const changes: ShiftChanges = { unknown: [], remove: [], rename: [], update: [], create: [] };

  requested.forEach((shift, sortOrder) => {
    const data: ShiftData = {
      nameAr: shift.nameAr,
      nameEn: shift.nameEn ?? null,
      startsMinute: shift.startsMinute,
      endsMinute: shift.endsMinute,
      sortOrder,
    };
    if (shift.id === undefined) {
      changes.create.push(data);
      return;
    }
    const current = byId.get(shift.id);
    if (!current) {
      changes.unknown.push(sortOrder);
      return;
    }
    kept.add(shift.id);
    if (current.nameAr !== shift.nameAr) changes.rename.push(shift.id);
    changes.update.push({ id: shift.id, data });
  });

  changes.remove = stored.filter(({ id }) => !kept.has(id)).map(({ id }) => id);
  return changes;
}
