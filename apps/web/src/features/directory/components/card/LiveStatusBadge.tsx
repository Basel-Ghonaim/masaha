import { Badge } from '@shared/design-system';
import type { SpaceCardView } from '../../types/SpaceCardView';

/** A space's live status by its word and its role, or, muted, that it has none. */
export function LiveStatusBadge({
  id,
  status,
  none,
}: {
  id?: string;
  status: SpaceCardView['status'];
  none: string;
}) {
  if (status === null)
    return (
      <span id={id} className="text-body-sm text-muted-foreground">
        {none}
      </span>
    );
  return (
    <Badge id={id} variant={status.variant}>
      {status.label}
    </Badge>
  );
}
