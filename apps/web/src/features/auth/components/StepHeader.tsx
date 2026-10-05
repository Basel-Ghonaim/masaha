import { CardDescription, CardHeader, CardTitle } from '@shared/design-system';
import type { ReactNode } from 'react';

/** The head of a recovery card: the step's title, which is the page's heading, and its line. */
export function StepHeader({
  icon,
  title,
  description,
}: {
  /** Drawn above the title, such as the mark of a step done. */
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <CardHeader>
      {icon}
      <CardTitle>
        <h1>{title}</h1>
      </CardTitle>
      {description !== undefined && <CardDescription>{description}</CardDescription>}
    </CardHeader>
  );
}
