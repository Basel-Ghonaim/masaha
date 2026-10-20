import type {
  CreatePackageRequest,
  SpacePackage,
  UpdatePackageRequest,
} from '@masaha/shared/packages';
import { api } from '@shared/api';

/** A space's packages on the server (docs/api/api-contract.md §5, Packages (managed)). */
export interface PackagesRepository {
  /** Every package of the space, retired ones included, in order. */
  list(spaceId: number): Promise<SpacePackage[]>;
  /** Adds a package, active and placed last. */
  create(spaceId: number, request: CreatePackageRequest): Promise<SpacePackage>;
  /** Edits a package's terms, or retires it or offers it again; what is absent is kept. */
  update(spaceId: number, packageId: number, request: UpdatePackageRequest): Promise<SpacePackage>;
}

export function createPackagesRepository(): PackagesRepository {
  const base = (spaceId: number) => `/manage/spaces/${String(spaceId)}/packages`;
  return {
    list: (spaceId) => api.get<SpacePackage[]>(base(spaceId)),
    create: (spaceId, request) => api.post<SpacePackage>(base(spaceId), request),
    update: (spaceId, packageId, request) =>
      api.patch<SpacePackage>(`${base(spaceId)}/${String(packageId)}`, request),
  };
}
