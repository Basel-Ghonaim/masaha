import type { UnlinkSubject } from '../hooks/unlink/useUnlinkOwnerDialog';
import type { LinkTarget } from './LinkTarget';

/** The owners' dialog open from a row or an editor: the link from one end, or an unlink. */
export type OwnerDialog =
  { kind: 'link'; target: LinkTarget } | ({ kind: 'unlink' } & UnlinkSubject);
