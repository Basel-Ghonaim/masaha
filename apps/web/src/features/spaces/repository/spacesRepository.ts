import type {
  AdminSpace,
  CreateSpaceRequest,
  FactGroup,
  UpdateSpaceAmenitiesRequest,
  UpdateSpaceContactsRequest,
  UpdateSpaceProfileRequest,
} from '@masaha/shared/spaces';
import { api } from '@shared/api';

/** The admin's calls on a space: its life on the platform, and its facts (docs/api/api-contract.md §5). */
export interface SpacesRepository {
  /** Creates a space from its profile: unverified and shown, its other facts missing. */
  create(request: CreateSpaceRequest): Promise<AdminSpace>;
  /** Reads one space whole, with whether it is verified. */
  get(spaceId: number): Promise<AdminSpace>;
  /** Changes the profile's fields it is given, `null` clearing an optional one. */
  updateProfile(spaceId: number, request: UpdateSpaceProfileRequest): Promise<AdminSpace>;
  /** Replaces the amenities group: the platform's amenities and the space's own. */
  updateAmenities(spaceId: number, request: UpdateSpaceAmenitiesRequest): Promise<AdminSpace>;
  /** Replaces the contacts, in their order. */
  updateContacts(spaceId: number, request: UpdateSpaceContactsRequest): Promise<AdminSpace>;
  /** Confirms a group unchanged: its date is renewed, nothing else. */
  confirm(spaceId: number, group: FactGroup): Promise<AdminSpace>;
  /** Hides a space from the public, or shows it again, verified or not. */
  setHidden(spaceId: number, isHidden: boolean): Promise<undefined>;
  /** Deletes a space softly: it leaves every list and the public, and can be restored. */
  remove(spaceId: number): Promise<undefined>;
  /** Brings a deleted space back as it was, hidden or not, with its links. */
  restore(spaceId: number): Promise<undefined>;
}

export function createSpacesRepository(): SpacesRepository {
  const path = (spaceId: number) => `/admin/spaces/${String(spaceId)}`;
  return {
    create: (request) => api.post<AdminSpace>('/admin/spaces', request),
    get: (spaceId) => api.get<AdminSpace>(path(spaceId)),
    updateProfile: (spaceId, request) => api.patch<AdminSpace>(path(spaceId), request),
    updateAmenities: (spaceId, request) =>
      api.put<AdminSpace>(`${path(spaceId)}/amenities`, request),
    updateContacts: (spaceId, request) => api.put<AdminSpace>(`${path(spaceId)}/contacts`, request),
    confirm: (spaceId, group) => api.post<AdminSpace>(`${path(spaceId)}/${group}/confirm`),
    setHidden: (spaceId, isHidden) => api.put<undefined>(`${path(spaceId)}/hidden`, { isHidden }),
    remove: (spaceId) => api.delete<undefined>(path(spaceId)),
    restore: (spaceId) => api.post<undefined>(`${path(spaceId)}/restore`),
  };
}
