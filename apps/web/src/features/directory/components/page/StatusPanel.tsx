import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from '@shared/design-system';
import type { ReactNode } from 'react';
import type { SpacePageView } from '../../types/SpacePageView';

/**
 * The status card: today's hours and, while near me holds a point, how far the space is; in the
 * aside from 1024 px, the contacts under them (`children`).
 */
export function StatusPanel({
  panel,
  children,
}: {
  panel: SpacePageView['panel'];
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{panel.title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-body-sm">
          {panel.live.kind === 'loading' && <Skeleton className="h-6 w-32" />}
          {panel.live.kind === 'line' && <p>{panel.live.line}</p>}
          {panel.live.kind === 'badge' && (
            <>
              <Badge variant={panel.live.variant}>{panel.live.label}</Badge>
              <p className="text-muted-foreground">{panel.live.live}</p>
            </>
          )}
        </div>
        {(panel.today !== null || panel.distance !== null) && (
          <div className="flex flex-col gap-1 text-body-sm">
            {panel.today !== null && <p>{panel.today}</p>}
            {panel.distance !== null && <p className="text-muted-foreground">{panel.distance}</p>}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
