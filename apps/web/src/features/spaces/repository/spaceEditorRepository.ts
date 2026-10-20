import type {
  AdminSpace,
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
import type { EditorPlace } from '../types/EditorPlace';

/**
 * The editor's calls on a space: its facts and its photos, read and written by the admin on the
 * admin's routes or by an owner on the managed ones (docs/api/api-contract.md §5). Both answer the
 * same shapes; who may write is the server's.
 */
export interface SpaceEditorRepository {
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
  /** Reads the gallery, in its order; the first is the cover. */
  listPhotos(spaceId: number): Promise<SpacePhoto[]>;
  /** Adds one photo, sent as a single part and shrunk in the browser first; it lands last. */
  uploadPhoto(
    spaceId: number,
    file: File,
    onProgress: UploadProgress,
    signal?: AbortSignal,
  ): Promise<SpacePhoto>;
  /** Removes a photo: it leaves the space's page at once and the ones after it move up. */
  removePhoto(spaceId: number, photoId: number): Promise<undefined>;
  /** Orders the gallery: every id, each once, first to last, and the first is the cover. */
  orderPhotos(spaceId: number, ids: number[]): Promise<undefined>;
}

/** Where each place's calls go: the admin's routes, or the managed ones of a space the caller holds. */
const BASES: Record<EditorPlace, string> = { admin: '/admin/spaces', owner: '/manage/spaces' };

export function createSpaceEditorRepository(place: EditorPlace): SpaceEditorRepository {
  const path = (spaceId: number) => `${BASES[place]}/${String(spaceId)}`;
  return {
    get: (spaceId) => api.get<AdminSpace>(path(spaceId)),
    updateProfile: (spaceId, request) => api.patch<AdminSpace>(path(spaceId), request),
    updateHours: (spaceId, request) => api.put<AdminSpace>(`${path(spaceId)}/hours`, request),
    updatePrices: (spaceId, request) => api.put<AdminSpace>(`${path(spaceId)}/prices`, request),
    updateAmenities: (spaceId, request) =>
      api.put<AdminSpace>(`${path(spaceId)}/amenities`, request),
    updateContacts: (spaceId, request) => api.put<AdminSpace>(`${path(spaceId)}/contacts`, request),
    confirm: (spaceId, group) => api.post<AdminSpace>(`${path(spaceId)}/${group}/confirm`),
    listPhotos: (spaceId) => api.get<SpacePhoto[]>(`${path(spaceId)}/photos`),
    uploadPhoto: (spaceId, file, onProgress, signal) =>
      sendMultipart<SpacePhoto>({
        url: `${path(spaceId)}/photos`,
        fieldName: 'photo',
        file,
        onProgress,
        ...(signal === undefined ? {} : { signal }),
      }),
    removePhoto: (spaceId, photoId) =>
      api.delete<undefined>(`${path(spaceId)}/photos/${String(photoId)}`),
    orderPhotos: (spaceId, ids) => api.put<undefined>(`${path(spaceId)}/photos/order`, { ids }),
  };
}
