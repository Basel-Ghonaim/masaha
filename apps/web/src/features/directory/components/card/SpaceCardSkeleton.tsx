import { Card, CardContent, CardHeader, Skeleton } from '@shared/design-system';

/** A card's shape while the list loads; hidden from assistive technology, as the results say so. */
export function SpaceCardSkeleton() {
  return (
    <Card aria-hidden className="h-full overflow-hidden pt-0">
      <Skeleton className="aspect-2/1 w-full rounded-none md:aspect-video" />
      <CardHeader>
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-32" />
      </CardContent>
    </Card>
  );
}
