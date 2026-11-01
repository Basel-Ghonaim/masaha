import type { AdminOverview, OwnerOverview } from '@masaha/shared/overview';
import { api } from '@shared/api';

/**
 * The overviews on the server (docs/api/api-contract.md › Overview): one read per screen, each
 * figure a count from the module that owns it, never an amount.
 */
export interface OverviewRepository {
  /** The owner's overview of the space `spaceId` (screen 12). */
  owner(spaceId: number): Promise<OwnerOverview>;
  /** The admin's overview of the platform (screen 25). */
  admin(): Promise<AdminOverview>;
}

export function createOverviewRepository(): OverviewRepository {
  return {
    owner: (spaceId) => api.get<OwnerOverview>(`/manage/spaces/${String(spaceId)}/overview`),
    admin: () => api.get<AdminOverview>('/admin/overview'),
  };
}
