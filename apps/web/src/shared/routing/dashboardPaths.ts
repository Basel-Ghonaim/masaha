/**
 * The dashboard's URL shape (ADR 0016): the admin's branch, and a space's branch with the space's id
 * in the path. Here, not in the dashboard's pages, because the landing rule and the space guard read
 * it too.
 */
export const DASHBOARD_PATHS = {
  admin: '/dashboard/admin',
  space: '/dashboard/spaces/:spaceId',
  spaceDesk: '/dashboard/spaces/:spaceId/desk',
} as const;

/** A space's overview, where its owner lands. */
export function spaceOverviewPath(spaceId: number): string {
  return DASHBOARD_PATHS.space.replace(':spaceId', String(spaceId));
}

/** A space's front desk, where its reception lands. */
export function spaceDeskPath(spaceId: number): string {
  return DASHBOARD_PATHS.spaceDesk.replace(':spaceId', String(spaceId));
}

/** The space id a URL's `:spaceId` names: a positive integer as written, nothing else. */
export function parseSpaceId(param: string | undefined): number | undefined {
  if (!param || !/^[1-9]\d*$/.test(param)) {
    return undefined;
  }
  const id = Number(param);
  return Number.isSafeInteger(id) ? id : undefined;
}
