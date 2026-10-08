import type { useAdminSpacesList } from '../hooks/admin-list/useAdminSpacesList';

/** The admin's spaces list, ready to render. */
export type AdminSpacesListView = ReturnType<typeof useAdminSpacesList>;
