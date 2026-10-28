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
 * A space in the directory: the whole card one link to its page, named by the space's name and
 * described by each detail in turn, so a screen reader that reads a link by its name reads them
 * after it. Its cover or mark, its name, its area, its live status, whether it is verified, today's
 * hours, and how far it is while the list is ordered by distance. No price. An action the page sets
 * (the heart) stands over the cover's corner, beside the link and never inside it.
 */
export function SpaceCard({
  card,
  href,
  areaName,
  action,
}: {
  card: SpaceCardView;
  href: string;
  areaName: ReactNode;
  action?: ReactNode;
}) {
  const nameId = useId();
  const ids = useId();
  const areaId = `${ids}-area`;
  const statusId = `${ids}-status`;
  const verifiedId = `${ids}-verified`;
  const todayId = `${ids}-today`;
  const distanceId = `${ids}-distance`;
  const details = [
    areaId,
    statusId,
    ...(card.verified === null ? [] : [verifiedId]),
    ...(card.today === null ? [] : [todayId]),
    ...(card.distance === null ? [] : [distanceId]),
  ];

  const link = (
    <Link
      to={href}
      aria-labelledby={nameId}
      aria-describedby={details.join(' ')}
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
          <CardDescription id={areaId}>{areaName}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <LiveStatusBadge id={statusId} status={card.status} none={card.noStatus} />
            {card.verified !== null && (
              <span id={verifiedId} className="flex items-center gap-1 text-body-sm text-primary">
                <CircleCheckIcon aria-hidden className="size-4" />
                {card.verified}
              </span>
            )}
          </div>
          {card.today !== null && (
            <p id={todayId} className="text-body-sm text-muted-foreground">
              {card.today}
            </p>
          )}
          {card.distance !== null && (
            <p id={distanceId} className="text-body-sm text-muted-foreground">
              {card.distance}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );

  return action === undefined ? (
    link
  ) : (
    <div className="relative h-full">
      {link}
      <div className="absolute end-3 top-3">{action}</div>
    </div>
  );
}
