import './_document';
import { Card, CardContent, CardHeader, Skeleton } from '@masaha/design-system';

// Ported from the showcase's SkeletonSection (apps/web/src/pages/showcase/sections/SkeletonSection.tsx).

// A member row while it loads: the avatar circle, the name and the phone line.
export function MemberRow() {
  return (
    <div className="flex w-full max-w-80 items-center gap-3">
      <Skeleton className="size-8 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  );
}

export function LoadingCard() {
  return (
    <Card className="w-full max-w-80">
      <CardHeader>
        <Skeleton className="h-5 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </CardContent>
    </Card>
  );
}
