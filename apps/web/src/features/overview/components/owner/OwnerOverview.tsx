import { Skeleton, StatCard } from '@shared/design-system';
import { Link } from 'react-router';
import { useOwnerOverview } from '../../hooks/owner/useOwnerOverview';
import type { OwnerOverviewLinks } from '../../types/OwnerOverviewLinks';
import { LoadFailure } from '../LoadFailure';
import { AttentionCard } from './AttentionCard';
import { EndingCard } from './EndingCard';
import { PresentCard } from './PresentCard';

/**
 * The owner's overview of the space (screen 12, D5.1): «يحتاج انتباهك» across the page; then who is
 * present now beside the announcements' tile, one column below 1024 px; then the subscriptions ending
 * this week. Every link is the page's. While it loads, a block in each place; a failure, its retry.
 */
export function OwnerOverview({ spaceId, links }: { spaceId: number; links: OwnerOverviewLinks }) {
  const overview = useOwnerOverview(spaceId, links);

  if (overview.state === 'loading') {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-40 w-full lg:col-span-2" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (overview.state === 'failed') {
    return <LoadFailure failure={overview.failure} />;
  }

  const { announcements } = overview;
  return (
    <div className="flex flex-col gap-6">
      <AttentionCard attention={overview.attention} />
      <div className="grid gap-6 lg:grid-cols-3">
        <PresentCard present={overview.present} className="lg:col-span-2" />
        <Link
          to={announcements.href}
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <StatCard
            label={announcements.label}
            value={announcements.value}
            helper={announcements.helper}
            className="h-full hover:bg-accent"
          />
        </Link>
      </div>
      <EndingCard ending={overview.ending} />
    </div>
  );
}
