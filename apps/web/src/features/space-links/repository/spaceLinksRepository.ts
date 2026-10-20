import type {
  AddOwnerRequest,
  AddedOwner,
  AdminRoleChoice,
  AdminSpaceRow,
  AdminUserRow,
  ChangeRoleRequest,
  ManagedSpace,
} from '@masaha/shared/space-links';
import type { AdminSpace } from '@masaha/shared/spaces';
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
  /** Adds an owner, linked to one space: a new account with a temporary password, or an upgrade. */
  addOwner(request: AddOwnerRequest): Promise<AddedOwner>;
  /** Up to fifty spaces by name, for choosing one in a dialog. */
  spaceChoices(q?: string): Promise<Page<AdminSpaceRow[]>>;
  /** Links a person to a space as its owner. */
  linkOwner(spaceId: number, userId: number): Promise<undefined>;
  /** Ends a person's owner link to a space. */
  unlinkOwner(spaceId: number, userId: number): Promise<undefined>;
  /** Up to fifty active people by name or email, for choosing one in a dialog. */
  personChoices(q?: string): Promise<Page<AdminUserRow[]>>;
  /** A space's active owners, oldest first, as the server reads them now. */
  spaceOwners(spaceId: number): Promise<AdminSpace['owners']>;
  /** Makes a person an admin, or a user again, while they hold no active link. */
  changeRole(userId: number, role: AdminRoleChoice): Promise<undefined>;
}

/** A space's owners, as the admin's routes name them. */
const ownersPath = (spaceId: number) => `/admin/spaces/${String(spaceId)}/owners`;

export function createSpaceLinksRepository(): SpaceLinksRepository {
  return {
    mySpaces: () => api.get<ManagedSpace[]>('/manage/spaces'),
    adminSpaces: (request) => api.getPage<AdminSpaceRow[]>('/admin/spaces', { params: request }),
    adminUsers: (request) => api.getPage<AdminUserRow[]>('/admin/users', { params: request }),
    addOwner: (request) => api.post<AddedOwner>('/admin/owners', request),
    spaceChoices: (q) =>
      api.getPage<AdminSpaceRow[]>('/admin/spaces', { params: { q, limit: 50 } }),
    linkOwner: (spaceId, userId) => api.post<undefined>(ownersPath(spaceId), { userId }),
    unlinkOwner: (spaceId, userId) =>
      api.delete<undefined>(`${ownersPath(spaceId)}/${String(userId)}`),
    personChoices: (q) =>
      api.getPage<AdminUserRow[]>('/admin/users', { params: { q, state: 'active', limit: 50 } }),
    spaceOwners: (spaceId) =>
      api.get<AdminSpace>(`/admin/spaces/${String(spaceId)}`).then((space) => space.owners),
    changeRole: (userId, role) =>
      api.put<undefined>(`/admin/users/${String(userId)}/role`, {
        role,
      } satisfies ChangeRoleRequest),
  };
}
