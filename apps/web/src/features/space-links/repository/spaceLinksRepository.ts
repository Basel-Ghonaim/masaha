import type { AdminSpaceRow, ManagedSpace } from '@masaha/shared/space-links';
import { api, type Page } from '@shared/api';
import type { AdminSpacesRequest } from '../types/AdminSpacesRequest';

/** The server's calls about the user's links to spaces (docs/api/api-contract.md §5). */
export interface SpaceLinksRepository {
  /** The spaces the user holds an active link to, with their role at each, oldest link first. */
  mySpaces(): Promise<ManagedSpace[]>;
  /** A page of the admin's spaces list, by English name, filtered as the request asks. */
  adminSpaces(request: AdminSpacesRequest): Promise<Page<AdminSpaceRow[]>>;
}

export function createSpaceLinksRepository(): SpaceLinksRepository {
  return {
    mySpaces: () => api.get<ManagedSpace[]>('/manage/spaces'),
    adminSpaces: (request) => api.getPage<AdminSpaceRow[]>('/admin/spaces', { params: request }),
  };
}
