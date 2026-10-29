import { lastDaysSince } from '@masaha/shared/core';
import type { AdminOverview } from '@masaha/shared/overview';

import type { DataReportsService } from '../data-reports/index.ts';
import type { AdminSpacesService } from '../space-links/index.ts';
import type { UsersService } from '../users/index.ts';

/** The modules the admin's overview reads, each the owner of its figures (conventions §9). */
export interface AdminOverviewSources {
  adminSpaces: AdminSpacesService;
  dataReports: DataReportsService;
  users: UsersService;
}

/** How many of the spaces to complete the overview names. */
const COMPLETENESS_NAMED = 5;

/** The days "new users" reach back, on Gaza's calendar (the owner's OV5). */
const NEW_USERS_DAYS = 30;

/**
 * The admin's overview of the platform at `at` (screen 25; the owner's OV4–OV6, A8): every figure
 * read from its owner in one parallel batch, with no lock and no snapshot (S21). An unverified
 * space has no active owner, so «بلا مالك» is the unverified count (OD2). Nothing of a space's
 * operations is read (ADR 0002).
 */
export async function adminOverview(
  { adminSpaces, dataReports, users }: AdminOverviewSources,
  at: Date,
): Promise<AdminOverview> {
  const [spaces, completeness, reports, newUsers] = await Promise.all([
    adminSpaces.counts(),
    adminSpaces.staleEditable(COMPLETENESS_NAMED),
    dataReports.openCounts(),
    users.countCreatedSince(lastDaysSince(at, NEW_USERS_DAYS)),
  ]);
  return {
    spaces: { ...spaces, unverifiedNoOwner: spaces.unverified },
    reports,
    newUsers,
    completeness,
    at: at.toISOString(),
  };
}
