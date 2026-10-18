import type { AdminSpaceRow, AdminUserRow, ManagedSpace } from '@masaha/shared/space-links';
import { api, type Page } from '@shared/api';
import type { AdminSpacesRequest } from '../types/AdminSpacesRequest';
import type { AdminUsersRequest } from '../types/AdminUsersRequest';

/** The server's calls about the user's links to spaces (docs/api/api-contract.md §5). */
export interface SpaceLinksRepository {
  /** The spaces the user holds an active link to, with their role at each, oldest link first. */
  mySpaces(): Promise<ManagedSpace[]>;
  /** A page of the admin's spaces list, by English name, filtered as the request asks. */
  adminSpaces(request: AdminSpacesRequest): Promise<Page<AdminSpaceRow[]>>;
  /** A page of the admin's users list, newest first, filtered as the request asks. */
  adminUsers(request: AdminUsersRequest): Promise<Page<AdminUserRow[]>>;
}

export function createSpaceLinksRepository(): SpaceLinksRepository {
  return {
    mySpaces: () => api.get<ManagedSpace[]>('/manage/spaces'),
    adminSpaces: (request) => api.getPage<AdminSpaceRow[]>('/admin/spaces', { params: request }),
    adminUsers: (request) => api.getPage<AdminUserRow[]>('/admin/users', { params: request }),
  };
}
