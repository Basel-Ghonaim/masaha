import type {
  AddedStaff,
  AddStaffRequest,
  SetStaffActiveRequest,
  StaffMember,
} from '@masaha/shared/space-links';
import type { HandoverRequest, IssuedTemporaryPassword } from '@masaha/shared/users';
import { api } from '@shared/api';

/** A space's staff on the server (docs/api/api-contract.md §5, Staff (managed)). */
export interface StaffRepository {
  /** Every reception link of the space, deactivated ones included, oldest first. */
  list(spaceId: number): Promise<StaffMember[]>;
  /** Creates a reception account for a new email, its temporary password answered once. */
  add(spaceId: number, request: AddStaffRequest): Promise<AddedStaff>;
  /** Deactivates a reception link, ending the person's sessions, or re-activates it. */
  setActive(spaceId: number, userId: number, request: SetStaffActiveRequest): Promise<StaffMember>;
  /** Issues a new temporary password while one is pending, answered once. */
  reissue(spaceId: number, userId: number): Promise<IssuedTemporaryPassword>;
  /** Records how the temporary password just shown was handed over. */
  handOver(spaceId: number, userId: number, request: HandoverRequest): Promise<undefined>;
}

export function createStaffRepository(): StaffRepository {
  const base = (spaceId: number) => `/manage/spaces/${String(spaceId)}/staff`;
  const member = (spaceId: number, userId: number) => `${base(spaceId)}/${String(userId)}`;
  return {
    list: (spaceId) => api.get<StaffMember[]>(base(spaceId)),
    add: (spaceId, request) => api.post<AddedStaff>(base(spaceId), request),
    setActive: (spaceId, userId, request) =>
      api.patch<StaffMember>(member(spaceId, userId), request),
    reissue: (spaceId, userId) =>
      api.post<IssuedTemporaryPassword>(`${member(spaceId, userId)}/temporary-password`),
    handOver: (spaceId, userId, request) =>
      api.post<undefined>(`${member(spaceId, userId)}/temporary-password/handover`, request),
  };
}
