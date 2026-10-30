import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Heatmap,
  Skeleton,
  StatCard,
} from '@shared/design-system';
import { useId } from 'react';
import { useOccupancyTab } from '../hooks/occupancy/useOccupancyTab';
import { ChartCard } from './ChartCard';
import { LoadFailure } from './LoadFailure';

/**
 * Finance › Occupancy (D5.5): the three tiles, «ساعات الذروة» — its content scrolling sideways below
 * 768 px — and visits and members per day. While it loads, blocks in their places; a failure, its
 * retry.
 */
export function OccupancyTab({ spaceId, asked }: { spaceId: number; asked: string | undefined }) {
  const occupancy = useOccupancyTab(spaceId, asked);
  const headingId = useId();

  if (occupancy.state === 'loading') {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (occupancy.state === 'failed') {
    return <LoadFailure failure={occupancy.failure} />;
  }
  const { heatmap } = occupancy;
  return (
    <div className="flex flex-col gap-4" aria-busy={occupancy.busy || undefined}>
      <div className="grid gap-4 md:grid-cols-3">
        {occupancy.tiles.map((tile) => (
          <StatCard
            key={tile.key}
            label={tile.label}
            value={<span dir="ltr">{tile.value}</span>}
            helper={tile.helper}
          />
        ))}
      </div>
      <Card role="region" aria-labelledby={headingId}>
        <CardHeader>
          <CardTitle>
            <h2 id={headingId}>{heatmap.title}</h2>
          </CardTitle>
          <CardDescription>{heatmap.description}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {heatmap.empty !== null ? (
            <EmptyState title={heatmap.empty} titleAs="h3" />
          ) : (
            <Heatmap {...heatmap.chart} className="min-w-xl md:min-w-0" />
          )}
        </CardContent>
      </Card>
      <ChartCard card={occupancy.byDay} size="md" />
    </div>
  );
}
