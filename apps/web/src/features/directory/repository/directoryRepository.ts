import type { DirectorySpace } from '@masaha/shared/directory';
import { api, type Page } from '@shared/api';
import type { DirectoryRequest } from '../types/DirectoryRequest';

/** The public directory on the server (docs/api/api-contract.md §5, Directory (public)). */
export interface DirectoryRepository {
  /** A page of the publicly listed spaces, as the query filters and orders them. */
  list(request: DirectoryRequest): Promise<Page<DirectorySpace[]>>;
}

export function createDirectoryRepository(): DirectoryRepository {
  return {
    list: (request) => api.getPage<DirectorySpace[]>('/spaces', { params: request }),
  };
}
