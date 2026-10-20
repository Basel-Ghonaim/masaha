import type { SpaceSettings, UpdateSpaceSettingsRequest } from '@masaha/shared/space-settings';
import { api } from '@shared/api';

/** A space's settings on the server (docs/api/api-contract.md §5, Settings (managed)). */
export interface SpaceSettingsRepository {
  /** The space's eight settings. */
  get(spaceId: number): Promise<SpaceSettings>;
  /** Edits any of them, what is absent kept; answers them as they now are. */
  update(spaceId: number, request: UpdateSpaceSettingsRequest): Promise<SpaceSettings>;
}

export function createSpaceSettingsRepository(): SpaceSettingsRepository {
  const path = (spaceId: number) => `/manage/spaces/${String(spaceId)}/settings`;
  return {
    get: (spaceId) => api.get<SpaceSettings>(path(spaceId)),
    update: (spaceId, request) => api.patch<SpaceSettings>(path(spaceId), request),
  };
}
