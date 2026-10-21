import { CircleCheckIcon } from '@shared/design-system';
import type { SpaceCardView } from '../../types/SpaceCardView';
import { LiveStatusBadge } from '../card/LiveStatusBadge';

/** The chosen space's live status, whether it is verified, and today's hours. */
export function SpaceSummary({ card }: { card: SpaceCardView }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <LiveStatusBadge status={card.status} none={card.noStatus} />
        {card.verified !== null && (
          <span className="flex items-center gap-1 text-body-sm text-primary">
            <CircleCheckIcon aria-hidden className="size-4" />
            {card.verified}
          </span>
        )}
      </div>
      {card.today !== null && <p className="text-body-sm text-muted-foreground">{card.today}</p>}
    </div>
  );
}
