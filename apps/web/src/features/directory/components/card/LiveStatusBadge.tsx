import { Badge } from '@shared/design-system';
import type { SpaceCardView } from '../../types/SpaceCardView';

/** A space's live status by its word and its role, or, muted, that it has none. */
export function LiveStatusBadge({
  status,
  none,
}: {
  status: SpaceCardView['status'];
  none: string;
}) {
  if (status === null) return <span className="text-body-sm text-muted-foreground">{none}</span>;
  return <Badge variant={status.variant}>{status.label}</Badge>;
}
