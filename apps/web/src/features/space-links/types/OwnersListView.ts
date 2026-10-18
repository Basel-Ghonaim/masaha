import type { useOwnersList } from '../hooks/owners-list/useOwnersList';

/** The admin's owners list, ready to render. */
export type OwnersListView = ReturnType<typeof useOwnersList>;
