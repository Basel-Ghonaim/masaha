import { Badge } from '@shared/design-system';
import type { ActionView } from '../services/actionWords';
import type { AuditRowView } from '../types/AuditRowView';

// The parts a row and a card share: the action's badge and the actor.

/** An action's badge: red for a destructive act; an action the web does not know as stored. */
export function ActionBadge({ action }: { action: ActionView }) {
  return (
    <Badge variant={action.tone} dir={action.known ? undefined : 'ltr'}>
      {action.text}
    </Badge>
  );
}

/** Who acted: a person's name isolated (`<bdi>`), or the platform's or the system's words. */
export function ActorText({ actor }: { actor: AuditRowView['actor'] }) {
  return actor.person ? <bdi>{actor.text}</bdi> : <>{actor.text}</>;
}
