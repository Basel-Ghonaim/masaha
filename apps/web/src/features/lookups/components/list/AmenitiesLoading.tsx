import { Skeleton } from '@shared/design-system';

/** Placeholders shaped like the amenities' rows, in a busy status named `label`. */
export function AmenitiesLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} aria-busy className="flex flex-col gap-2">
      {[0, 1, 2, 3].map((row) => (
        <Skeleton key={row} className="h-10 w-full" />
      ))}
    </div>
  );
}
