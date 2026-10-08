import type { AdminSpacesQuery } from '@masaha/shared/space-links';

/** What the list asks the server for: its filters, named as the contract names them, and a page. */
export type AdminSpacesRequest = Omit<Partial<AdminSpacesQuery>, 'limit' | 'stale'> & {
  /** Sent only to keep the stale spaces. */
  stale?: true;
};
