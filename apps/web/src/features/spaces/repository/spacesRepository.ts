import type { AdminSpace, CreateSpaceRequest } from '@masaha/shared/spaces';
import { api } from '@shared/api';

/**
 * The admin's calls on a space's life on the platform: its creation, its visibility, its deletion and
 * restore (docs/api/api-contract.md §5). Its facts and photos are the editor's
 * (`SpaceEditorRepository`), read and written by the admin or an owner.
 */
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
  const path = (spaceId: number) => `/admin/spaces/${String(spaceId)}`;
  return {
    create: (request) => api.post<AdminSpace>('/admin/spaces', request),
    setHidden: (spaceId, isHidden) => api.put<undefined>(`${path(spaceId)}/hidden`, { isHidden }),
    remove: (spaceId) => api.delete<undefined>(path(spaceId)),
    restore: (spaceId) => api.post<undefined>(`${path(spaceId)}/restore`),
  };
}
