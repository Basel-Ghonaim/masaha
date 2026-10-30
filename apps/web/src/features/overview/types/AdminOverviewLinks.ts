/**
 * Where the admin's overview leads: every link the page passes, since a feature knows no routes
 * (docs/frontend/architecture.md §3).
 */
export type AdminOverviewLinks = {
  /** The spaces list. */
  spaces: string;
  /** The data reports still open. */
  reportsOpen: string;
  /** The spaces with a fact group stale or missing. */
  stale: string;
  /** The unverified spaces. */
  unverified: string;
  /** The users list, newest first. */
  users: string;
  /** A space's editor. */
  space: (spaceId: number) => string;
  /** «اكتمال البيانات»'s full list: the spaces the admin edits, stale or missing. */
  completenessAll: string;
};
