import type { SetCapacityRequest, SpaceCapacity } from '@masaha/shared/occupancy';
import { api } from '@shared/api';

/** A space's capacity on the server (docs/api/api-contract.md §5, Capacity (managed)). */
export interface OccupancyRepository {
  /** The most people the space seats; `null` before one is set. */
  getCapacity(spaceId: number): Promise<SpaceCapacity>;
  /** Sets it whole, or clears it with `null`; answers it as it now is. */
  setCapacity(spaceId: number, request: SetCapacityRequest): Promise<SpaceCapacity>;
}

export function createOccupancyRepository(): OccupancyRepository {
  const path = (spaceId: number) => `/manage/spaces/${String(spaceId)}/capacity`;
  return {
    getCapacity: (spaceId) => api.get<SpaceCapacity>(path(spaceId)),
    setCapacity: (spaceId, request) => api.put<SpaceCapacity>(path(spaceId), request),
  };
}
