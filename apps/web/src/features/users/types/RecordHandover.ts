import type { HandoverChannel } from '@masaha/shared/users';

/**
 * Records how a temporary password just shown reached its person, on the route of the place that
 * issued it: the admin's, or a space's for its staff. The caller holds the write; the one-time
 * dialog only waits on it.
 */
export type RecordHandover = (request: {
  userId: number;
  channel: HandoverChannel;
}) => Promise<unknown>;
