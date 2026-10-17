import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/design-system';
import type { ReactNode } from 'react';

/**
 * «الصور», the gallery's frame: a card titled by its `h2` and its intro, its tiles below. Photos are
 * no fact group, so it carries no date, no staleness and nothing to save; its id is the navigation's
 * anchor, as every section's is.
 */
export function PhotosCard({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  /** A verified space's copy has none: it describes changes, and it changes nothing. */
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-28 lg:scroll-mt-20">
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        {description !== undefined && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="gap-4">{children}</CardContent>
    </Card>
  );
}
