import type { HandoverRequest } from '@masaha/shared/users';
import type { RecordHandover } from '../types/RecordHandover';
import { createUsersRepository } from './usersRepository';

const repository = createUsersRepository();

/** The admin's handover: a password the admin issued, or an owner's the admin created. */
export const recordAdminHandover: RecordHandover = ({ userId, channel }) =>
  repository.handOver(userId, { channel } satisfies HandoverRequest);
