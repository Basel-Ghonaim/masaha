import type { AdminSpace, CreateSpaceRequest } from '@masaha/shared/spaces';
import { api } from '@shared/api';

/** The admin's calls on a space's life on the platform (docs/api/api-contract.md §5). */
export interface SpacesRepository {
  /** Creates a space from its profile: unverified and shown, its other facts missing. */
  create(request: CreateSpaceRequest): Promise<AdminSpace>;
  /** Hides a space from the public, or shows it again, verified or not. */
  setHidden(spaceId: number, isHidden: boolean): Promise<undefined>;
  /** Deletes a space softly: it leaves every list and the public, and can be restored. */
  remove(spaceId: number): Promise<undefined>;
  /** Brings a deleted space back as it was, hidden or not, with its links. */
  restore(spaceId: number): Promise<undefined>;
}

export function createSpacesRepository(): SpacesRepository {
  return {
    create: (request) => api.post<AdminSpace>('/admin/spaces', request),
    setHidden: (spaceId, isHidden) =>
      api.put<undefined>(`/admin/spaces/${String(spaceId)}/hidden`, { isHidden }),
    remove: (spaceId) => api.delete<undefined>(`/admin/spaces/${String(spaceId)}`),
    restore: (spaceId) => api.post<undefined>(`/admin/spaces/${String(spaceId)}/restore`),
  };
}
