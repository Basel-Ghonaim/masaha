import {
  NEAR_HEADER,
  type DirectorySpace,
  type MapPins,
  type PublicSpace,
} from '@masaha/shared/directory';
import { api, type Page } from '@shared/api';
import { nearHeader } from '../services/nearPoint';
import type { DirectoryRequest } from '../types/DirectoryRequest';
import type { NearPoint } from '../types/NearState';
import type { PinsRequest } from '../types/PinsRequest';

/** The public directory on the server (docs/api/api-contract.md §5, Directory (public)). */
export interface DirectoryRepository {
  /**
   * A page of the publicly listed spaces, as the query filters and orders them; the rounded point to
   * order by distance travels in the `Masaha-Near` header only, never in the query a URL logs.
   */
  list(request: DirectoryRequest, near: NearPoint | null): Promise<Page<DirectorySpace[]>>;
  /** The map's pins: every space that passes the filters, up to the ceiling, or within the box. */
  pins(request: PinsRequest): Promise<MapPins>;
  /** A publicly listed space's page, by its slug; a hidden, deleted or unknown one is a 404. */
  space(slug: string): Promise<PublicSpace>;
}

export function createDirectoryRepository(): DirectoryRepository {
  return {
    list: (request, near) =>
      api.getPage<DirectorySpace[]>('/spaces', {
        params: request,
        ...(near !== null && { headers: { [NEAR_HEADER]: nearHeader(near) } }),
      }),
    pins: (request) => api.get<MapPins>('/map/spaces', { params: request }),
    space: (slug) => api.get<PublicSpace>(`/spaces/${encodeURIComponent(slug)}`),
  };
}
