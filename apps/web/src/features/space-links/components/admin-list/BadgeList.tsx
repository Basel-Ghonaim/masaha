import { Badge } from '@shared/design-system';
import type { BadgeView } from '../../types/AdminSpaceRowView';

/** Badges side by side, wrapping on a narrow screen. */
export function BadgeList({ badges }: { badges: BadgeView[] }) {
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
