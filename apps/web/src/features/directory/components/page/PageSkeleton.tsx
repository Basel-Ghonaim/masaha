import { Skeleton } from '@shared/design-system';

/** While a space's page loads: its head, then sections, in the page's shape. */
export function PageSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-56 w-full rounded-lg" />
    </div>
  );
}
