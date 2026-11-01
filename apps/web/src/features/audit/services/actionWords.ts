import type { Catalogue } from '@shared/copy';
import type { AuditScope } from '../types/AuditScope';

/**
 * The acts whose confirmation is destructive, red on each log (AD-028 as amended): the owner's
 * void, access removed, the subscriptions extended and a photo deleted; the admin's deletion,
 * suspension and unlinking.
 */
const DESTRUCTIVE: Record<AuditScope, readonly string[]> = {
  space: [
    'payment.voided',
    'space.staffDeactivated',
    'closure.subscriptionsExtended',
    'space.photoRemoved',
  ],
  platform: ['space.deleted', 'user.suspended', 'space.ownerUnlinked'],
};

/** An entry's action as its badge shows it. */
export type ActionView = {
  text: string;
  /** Whether the web has words for it; an action it does not know shows as stored, left to right. */
  known: boolean;
  tone: 'neutral' | 'destructive';
};

/** An action as stored, in the log's words, red where its act is destructive on the scope's log. */
export function actionView(
  action: string,
  words: Catalogue['audit']['actions'],
  scope: AuditScope,
): ActionView {
  const text = (words as Readonly<Record<string, string | undefined>>)[action];
  return {
    text: text ?? action,
    known: text !== undefined,
    tone: DESTRUCTIVE[scope].includes(action) ? 'destructive' : 'neutral',
  };
}
