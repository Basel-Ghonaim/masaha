import type {
  AdminArea,
  AdminGovernorate,
  AdminGovernorateWithAreas,
  CreateAreaRequest,
  CreateGovernorateRequest,
  UpdateAreaRequest,
  UpdateGovernorateRequest,
} from '@masaha/shared/lookups';
import { api } from '@shared/api';

/** The admin's lookup lists on the server (docs/api/api-contract.md §5, Lookups). */
export interface LookupsRepository {
  /** Every governorate, hidden ones included, each with all its areas, both lists in order. */
  governorates(): Promise<AdminGovernorateWithAreas[]>;
  /** Adds a governorate, active and placed last. */
  addGovernorate(request: CreateGovernorateRequest): Promise<AdminGovernorate>;
  /** Renames a governorate, hides it or restores it; what is absent is kept. */
  editGovernorate(id: number, request: UpdateGovernorateRequest): Promise<AdminGovernorate>;
  /** Adds an area to its governorate, active and placed last in it. */
  addArea(request: CreateAreaRequest): Promise<AdminArea>;
  /** Renames an area, hides it or restores it; what is absent is kept. */
  editArea(id: number, request: UpdateAreaRequest): Promise<AdminArea>;
  /** Sets the governorates' order: every governorate's id, first to last. */
  orderGovernorates(ids: number[]): Promise<undefined>;
  /** Sets the order of a governorate's areas: every one of its areas' ids, first to last. */
  orderAreas(governorateId: number, ids: number[]): Promise<undefined>;
}

export function createLookupsRepository(): LookupsRepository {
  return {
    governorates: () => api.get<AdminGovernorateWithAreas[]>('/admin/governorates'),
    addGovernorate: (request) => api.post<AdminGovernorate>('/admin/governorates', request),
    editGovernorate: (id, request) =>
      api.patch<AdminGovernorate>(`/admin/governorates/${String(id)}`, request),
    addArea: (request) => api.post<AdminArea>('/admin/areas', request),
    editArea: (id, request) => api.patch<AdminArea>(`/admin/areas/${String(id)}`, request),
    orderGovernorates: (ids) => api.put<undefined>('/admin/governorates/order', { ids }),
    orderAreas: (governorateId, ids) =>
      api.put<undefined>(`/admin/governorates/${String(governorateId)}/areas/order`, { ids }),
  };
}
