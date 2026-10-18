import type { AdminUsersQuery } from '@masaha/shared/space-links';

/** What the users list asks the server for: its filters, named as the contract names them, and a page. */
export type AdminUsersRequest = Omit<Partial<AdminUsersQuery>, 'limit'>;
