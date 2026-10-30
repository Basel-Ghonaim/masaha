import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Meter,
} from '@shared/design-system';
import { useId } from 'react';
import { Link } from 'react-router';
import type { OwnerOverviewView } from '../../hooks/owner/useOwnerOverview';

type PresentView = Extract<OwnerOverviewView, { state: 'ready' }>['present'];

/**
 * «الحاضرون الآن»: how many are present, over the capacity when one is set, with the meter then
 * only; who they are, counted; and what visitors see, with its line.
 */
export function PresentCard({ present, className }: { present: PresentView; className?: string }) {
  const headingId = useId();

  return (
    <Card role="region" aria-labelledby={headingId} className={className}>
      <CardHeader>
        <CardDescription>
          <h2 id={headingId}>{present.title}</h2>
        </CardDescription>
        <CardTitle className="text-display" dir="ltr">
          {present.ratio}
        </CardTitle>
        <CardAction>
          <Button asChild variant="outline" size="sm">
            <Link to={present.view.href}>{present.view.label}</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {present.meter !== null && <Meter {...present.meter} />}
        <p className="text-body-sm">{present.now}</p>
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
          <Badge variant={present.state.tone}>{present.state.label}</Badge>
          <span className="text-caption text-muted-foreground">{present.line}</span>
        </div>
      </CardContent>
    </Card>
  );
}
