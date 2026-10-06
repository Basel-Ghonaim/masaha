import type { AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import { api } from '@shared/api';

/** The admin's lookup lists on the server (docs/api/api-contract.md §5, Lookups). */
export interface LookupsRepository {
  /** Every governorate, hidden ones included, each with all its areas, both lists in order. */
  governorates(): Promise<AdminGovernorateWithAreas[]>;
}

export function createLookupsRepository(): LookupsRepository {
  return {
    governorates: () => api.get<AdminGovernorateWithAreas[]>('/admin/governorates'),
  };
}
