import { Badge, type BadgeProps } from '@shared/design-system';

/** A space's state as two facts: whether it is verified, always, and hidden, when it is. */
export function SpaceStatusBadges({
  badges,
}: {
  badges: { label: string; variant: NonNullable<BadgeProps['variant']> }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {badges.map((badge) => (
        <Badge key={badge.label} variant={badge.variant}>
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}
