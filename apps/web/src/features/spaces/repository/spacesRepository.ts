import type {
  AdminSpace,
  CreateSpaceRequest,
  FactGroup,
  SpacePhoto,
  UpdateSpaceAmenitiesRequest,
  UpdateSpaceContactsRequest,
  UpdateSpaceHoursRequest,
  UpdateSpacePricesRequest,
  UpdateSpaceProfileRequest,
} from '@masaha/shared/spaces';
import { api } from '@shared/api';
import { sendMultipart, type UploadProgress } from '@shared/uploads';

/** The admin's calls on a space: its life on the platform, and its facts (docs/api/api-contract.md §5). */
export interface SpacesRepository {
  /** Creates a space from its profile: unverified and shown, its other facts missing. */
  create(request: CreateSpaceRequest): Promise<AdminSpace>;
  /** Reads one space whole, with whether it is verified. */
  get(spaceId: number): Promise<AdminSpace>;
  /** Changes the profile's fields it is given, `null` clearing an optional one. */
  updateProfile(spaceId: number, request: UpdateSpaceProfileRequest): Promise<AdminSpace>;
  /** Replaces the opening hours with the shifts, together; a shift keeps its id. */
  updateHours(spaceId: number, request: UpdateSpaceHoursRequest): Promise<AdminSpace>;
  /** Replaces the prices, in their order. */
  updatePrices(spaceId: number, request: UpdateSpacePricesRequest): Promise<AdminSpace>;
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
  /** Reads the gallery, in its order; the first is the cover. */
  listPhotos(spaceId: number): Promise<SpacePhoto[]>;
  /** Adds one photo, sent as a single part and shrunk in the browser first; it lands last. */
  uploadPhoto(spaceId: number, file: File, onProgress?: UploadProgress): Promise<SpacePhoto>;
  /** Removes a photo: it leaves the space's page at once and the ones after it move up. */
  removePhoto(spaceId: number, photoId: number): Promise<undefined>;
  /** Orders the gallery: every id, each once, first to last, and the first is the cover. */
  orderPhotos(spaceId: number, ids: number[]): Promise<undefined>;
}

export function createSpacesRepository(): SpacesRepository {
  const path = (spaceId: number) => `/admin/spaces/${String(spaceId)}`;
  return {
    create: (request) => api.post<AdminSpace>('/admin/spaces', request),
    get: (spaceId) => api.get<AdminSpace>(path(spaceId)),
    updateProfile: (spaceId, request) => api.patch<AdminSpace>(path(spaceId), request),
    updateHours: (spaceId, request) => api.put<AdminSpace>(`${path(spaceId)}/hours`, request),
    updatePrices: (spaceId, request) => api.put<AdminSpace>(`${path(spaceId)}/prices`, request),
    updateAmenities: (spaceId, request) =>
      api.put<AdminSpace>(`${path(spaceId)}/amenities`, request),
    updateContacts: (spaceId, request) => api.put<AdminSpace>(`${path(spaceId)}/contacts`, request),
    confirm: (spaceId, group) => api.post<AdminSpace>(`${path(spaceId)}/${group}/confirm`),
    setHidden: (spaceId, isHidden) => api.put<undefined>(`${path(spaceId)}/hidden`, { isHidden }),
    remove: (spaceId) => api.delete<undefined>(path(spaceId)),
    restore: (spaceId) => api.post<undefined>(`${path(spaceId)}/restore`),
    listPhotos: (spaceId) => api.get<SpacePhoto[]>(`${path(spaceId)}/photos`),
    uploadPhoto: (spaceId, file, onProgress) =>
      sendMultipart<SpacePhoto>({
        url: `${path(spaceId)}/photos`,
        fieldName: 'photo',
        file,
        ...(onProgress === undefined ? {} : { onProgress }),
      }),
    removePhoto: (spaceId, photoId) =>
      api.delete<undefined>(`${path(spaceId)}/photos/${String(photoId)}`),
    orderPhotos: (spaceId, ids) => api.put<undefined>(`${path(spaceId)}/photos/order`, { ids }),
  };
}
