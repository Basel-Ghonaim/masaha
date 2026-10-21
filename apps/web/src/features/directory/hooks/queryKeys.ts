import type { DirectoryRequest } from '../types/DirectoryRequest';

/** The capability's query keys, under the public scope (docs/frontend/architecture.md §7). */
export const directoryKeys = {
  all: ['public', 'directory'] as const,
  /** A page of the list, one key per request. */
  list: (request: DirectoryRequest) => ['public', 'directory', 'list', request] as const,
};
