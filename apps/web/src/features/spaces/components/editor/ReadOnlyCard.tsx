import { Card, CardContent, CardHeader, CardTitle } from '@shared/design-system';
import type { ReactNode } from 'react';

/** A section of a read-only space: a card titled by its `h2`, its values below. */
export function ReadOnlyCard({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-28 lg:scroll-mt-20">
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="gap-4">{children}</CardContent>
    </Card>
  );
}
