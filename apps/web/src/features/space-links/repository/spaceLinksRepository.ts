import type { ManagedSpace } from '@masaha/shared/space-links';
import { api } from '@shared/api';

/** The server's calls about the user's links to spaces (docs/api/api-contract.md §5). */
export interface SpaceLinksRepository {
  /** The spaces the user holds an active link to, with their role at each, oldest link first. */
  mySpaces(): Promise<ManagedSpace[]>;
}

export function createSpaceLinksRepository(): SpaceLinksRepository {
  return {
    mySpaces: () => api.get<ManagedSpace[]>('/manage/spaces'),
  };
}
