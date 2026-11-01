import { Skeleton } from '@shared/design-system';
import { useAdminOverview } from '../../hooks/admin/useAdminOverview';
import type { AdminOverviewLinks } from '../../types/AdminOverviewLinks';
import { LoadFailure } from '../LoadFailure';
import { CompletenessCard } from './CompletenessCard';
import { PlatformTiles } from './PlatformTiles';

/**
 * The admin's overview of the platform (screen 25, D5.2): the five tiles, «اكتمال البيانات», and the
 * note that a space's operating data is its management's. Every link is the page's. While it loads,
 * a block in each place; a failure, its retry.
 */
export function AdminOverview({ links }: { links: AdminOverviewLinks }) {
  const overview = useAdminOverview(links);

  if (overview.state === 'loading') {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (overview.state === 'failed') {
    return <LoadFailure failure={overview.failure} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PlatformTiles tiles={overview.tiles} />
      <CompletenessCard completeness={overview.completeness} />
      <p className="rounded-lg bg-muted p-4 text-body-sm text-muted-foreground">
        {overview.privacy}
      </p>
    </div>
  );
}
