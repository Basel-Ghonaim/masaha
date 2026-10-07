import type { AdminSpacesRequest } from '../types/AdminSpacesRequest';

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
};
