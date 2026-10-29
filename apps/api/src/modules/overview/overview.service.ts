import type { AdminOverview, OwnerOverview } from '@masaha/shared/overview';

import type { LoadedSpace } from '../../shared/auth/index.ts';
import { adminOverview, type AdminOverviewSources } from './adminOverview.ts';
import { ownerOverview, type OwnerOverviewSources } from './ownerOverview.ts';

interface Dependencies extends OwnerOverviewSources, AdminOverviewSources {
  /** The one clock (conventions §11): each overview is read at one instant. */
  now: () => Date;
}

/**
 * The overviews (docs/backend/conventions.md › `overview`): read compositions, one per screen, with
 * no logic, no repository and no write; every figure is its owning module's (R7, S20).
 */
export function createOverviewService({ now, ...sources }: Dependencies) {
  return {
    /** The owner's overview of the space, now (`ownerOverview.ts`). */
    owner(space: LoadedSpace): Promise<OwnerOverview> {
      return ownerOverview(sources, space, now());
    },

    /** The admin's overview of the platform, now (`adminOverview.ts`). */
    admin(): Promise<AdminOverview> {
      return adminOverview(sources, now());
    },
  };
}

export type OverviewService = ReturnType<typeof createOverviewService>;
