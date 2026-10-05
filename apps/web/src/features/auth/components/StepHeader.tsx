import { CardDescription, CardHeader, CardTitle } from '@shared/design-system';

/** The head of a recovery card: the step's title, which is the page's heading, and its line. */
export function StepHeader({ title, description }: { title: string; description?: string }) {
  return (
    <CardHeader>
      <CardTitle>
        <h1>{title}</h1>
      </CardTitle>
      {description !== undefined && <CardDescription>{description}</CardDescription>}
    </CardHeader>
  );
}
