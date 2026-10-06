import { Card, CardContent, CardHeader, Skeleton } from '@shared/design-system';

/** Placeholders shaped like the governorates' cards, in a busy status named `label`. */
export function GovernoratesLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} aria-busy className="flex flex-col gap-4">
      {[0, 1].map((card) => (
        <Card key={card}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent>
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
