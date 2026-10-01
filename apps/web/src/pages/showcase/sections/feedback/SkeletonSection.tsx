import { Card, CardContent, CardHeader, Skeleton } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type SkeletonSamples = {
  title: string;
  rowCaption: string;
  cardCaption: string;
};

export function SkeletonSection({ samples }: { samples: SkeletonSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.rowCaption}>
        <div className="flex w-full max-w-80 items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </div>
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.cardCaption}>
        <Card className="w-full max-w-80">
          <CardHeader>
            <Skeleton className="h-5 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
