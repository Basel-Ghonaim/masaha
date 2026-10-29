import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@shared/design-system';
import type { ReactNode } from 'react';
import type { UnlistedFavoriteView } from '../../hooks/favorites/useFavoritesView';

/**
 * A saved space that left the directory (C7): a muted card with its name as text, the line that says
 * it left, and the page's action (`action`, «إزالة»).
 */
export function UnlistedFavorite({
  space,
  action,
}: {
  space: UnlistedFavoriteView;
  action: ReactNode;
}) {
  return (
    <Card className="bg-muted">
      <CardHeader>
        <CardTitle>
          <h3 className="text-muted-foreground">
            <span lang={space.name.lang} dir={space.name.dir}>
              {space.name.text}
            </span>
          </h3>
        </CardTitle>
        <CardDescription>{space.line}</CardDescription>
        <CardAction>{action}</CardAction>
      </CardHeader>
    </Card>
  );
}
