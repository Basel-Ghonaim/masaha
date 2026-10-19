import type { AdminSpacesRequest } from '../types/AdminSpacesRequest';
import type { AdminUsersRequest } from '../types/AdminUsersRequest';

/** The capability's query keys, scoped as docs/frontend/architecture.md §7 says. */
export const spaceLinksKeys = {
  /** The signed-in user's own spaces. */
  mySpaces: ['me', 'spaces'] as const,
  /**
   * A page of the admin's spaces list, one key per request, under the admin's scope: an admin's write
   * on a space refreshes that scope whole (`spaces`), so the list never needs its key named.
   */
  adminSpaces: (request: AdminSpacesRequest) =>
    ['admin', 'space-links', 'spaces', request] as const,
  /** A page of the admin's users list, one key per request, under the admin's scope too. */
  adminUsers: (request: AdminUsersRequest) => ['admin', 'space-links', 'users', request] as const,
  /** Up to fifty spaces by name, for choosing one in a dialog. */
  spaceChoices: (q: string | undefined) => ['admin', 'space-links', 'space-choices', q] as const,
  /** Up to fifty active people by name or email, for choosing one in a dialog. */
  personChoices: (q: string | undefined) => ['admin', 'space-links', 'person-choices', q] as const,
  /** A space's owners, read when an unlink asks, so its consequence is the server's. */
  spaceOwners: (spaceId: number) => ['admin', 'space-links', 'space-owners', spaceId] as const,
};
