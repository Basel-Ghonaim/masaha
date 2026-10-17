import { Badge } from '@shared/design-system';
import type { BadgeView } from '../../types/AdminSpaceRowView';

/** Badges side by side, wrapping on a narrow screen; nothing is drawn where there are none. */
export function BadgeList({ badges }: { badges: BadgeView[] }) {
  if (badges.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <Badge key={badge.label} variant={badge.variant}>
          {badge.label}
        </Badge>
      ))}
    </span>
  );
}
