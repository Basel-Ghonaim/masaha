import { Skeleton, StatCard } from '@shared/design-system';
import { useIncomeTab } from '../hooks/income/useIncomeTab';
import { ChartCard } from './ChartCard';
import { CollectionsTable } from './CollectionsTable';
import { LoadFailure } from './LoadFailure';

/**
 * Finance › Income (D5.3): what income counts, the three tiles, the two charts and the collections.
 * While it loads, blocks in their places; a failure, its retry.
 */
export function IncomeTab({ spaceId, asked }: { spaceId: number; asked: string | undefined }) {
  const income = useIncomeTab(spaceId, asked);

  if (income.state === 'loading') {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (income.state === 'failed') {
    return <LoadFailure failure={income.failure} />;
  }
  return (
    <div className="flex flex-col gap-4" aria-busy={income.busy || undefined}>
      <p className="text-caption text-muted-foreground">{income.definition}</p>
      <div className="grid gap-4 md:grid-cols-3">
        {income.tiles.map((tile) => (
          <StatCard
            key={tile.key}
            label={tile.label}
            value={<span dir="ltr">{tile.value}</span>}
            helper={tile.helper}
          />
        ))}
      </div>
      <ChartCard card={income.byMonth} size="md" />
      <ChartCard card={income.byDay} size="sm" />
      <CollectionsTable collections={income.collections} />
    </div>
  );
}
