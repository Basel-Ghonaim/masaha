import type {
  SetCapacityRequest,
  SetStatusOverrideRequest,
  SpaceCapacity,
  SpaceOccupancyNow,
} from '@masaha/shared/occupancy';
import { api } from '@shared/api';

/**
 * A space's capacity and its state now on the server (docs/api/api-contract.md §5, Capacity
 * (managed), Occupancy (managed)).
 */
export interface OccupancyRepository {
  /** The most people the space seats; `null` before one is set. */
  getCapacity(spaceId: number): Promise<SpaceCapacity>;
  /** Sets it whole, or clears it with `null`; answers it as it now is. */
  setCapacity(spaceId: number, request: SetCapacityRequest): Promise<SpaceCapacity>;
  /** The space's state now, as its staff see it: the live status, the override and who is present. */
  stateNow(spaceId: number): Promise<SpaceOccupancyNow>;
  /** Sets the live status by hand for a while, replacing the override in force; answers the state now. */
  setOverride(spaceId: number, request: SetStatusOverrideRequest): Promise<SpaceOccupancyNow>;
  /** Clears the override in force, the status automatic again; answers the state now. */
  clearOverride(spaceId: number): Promise<SpaceOccupancyNow>;
}

export function createOccupancyRepository(): OccupancyRepository {
  const space = (spaceId: number) => `/manage/spaces/${String(spaceId)}`;
  const path = (spaceId: number) => `${space(spaceId)}/capacity`;
  const override = (spaceId: number) => `${space(spaceId)}/status-override`;
  return {
    getCapacity: (spaceId) => api.get<SpaceCapacity>(path(spaceId)),
    setCapacity: (spaceId, request) => api.put<SpaceCapacity>(path(spaceId), request),
    stateNow: (spaceId) => api.get<SpaceOccupancyNow>(`${space(spaceId)}/occupancy`),
    setOverride: (spaceId, request) => api.put<SpaceOccupancyNow>(override(spaceId), request),
    clearOverride: (spaceId) => api.delete<SpaceOccupancyNow>(override(spaceId)),
  };
}
