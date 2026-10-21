import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CircleCheckIcon,
} from '@shared/design-system';
import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { SpaceCardView } from '../../types/SpaceCardView';
import { LiveStatusBadge } from './LiveStatusBadge';
import { SpaceCover } from './SpaceCover';

/**
 * A space in the directory: the whole card one link to its page, named by the space's name. Its
 * cover or mark, its name, its area, its live status, whether it is verified, and today's hours. No
 * price.
 */
export function SpaceCard({
  card,
  href,
  areaName,
}: {
  card: SpaceCardView;
  href: string;
  areaName: ReactNode;
}) {
  const nameId = useId();

  return (
    <Link
      to={href}
      aria-labelledby={nameId}
      className="block h-full rounded-lg text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Card className="h-full overflow-hidden pt-0 hover:bg-accent">
        <SpaceCover cover={card.cover} mark={card.mark} />
        <CardHeader>
          <CardTitle>
            <h3 id={nameId}>
              <span lang={card.name.lang} dir={card.name.dir}>
                {card.name.text}
              </span>
            </h3>
          </CardTitle>
          <CardDescription>{areaName}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <LiveStatusBadge status={card.status} none={card.noStatus} />
            {card.verified !== null && (
              <span className="flex items-center gap-1 text-body-sm text-primary">
                <CircleCheckIcon aria-hidden className="size-4" />
                {card.verified}
              </span>
            )}
          </div>
          {card.today !== null && (
            <p className="text-body-sm text-muted-foreground">{card.today}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
