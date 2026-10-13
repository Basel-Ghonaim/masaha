import { Skeleton } from '@shared/design-system';

/** While the space loads: the shape of its first sections, named for assistive technology. */
export function EditorLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-6">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
