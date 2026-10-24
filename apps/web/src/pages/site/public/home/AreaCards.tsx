import {
  Alert,
  AlertAction,
  AlertTitle,
  ArrowEndIcon,
  Button,
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@shared/design-system';
import { useId, type Ref } from 'react';
import { Link } from 'react-router';
import { useAreaCards } from './useAreaCards';

const SKELETONS = [1, 2, 3];

/**
 * «تصفّح حسب المنطقة»: a section named by its heading, which takes the focus when Home's «اختر
 * منطقتك» brings it into view; each area a card that is one link to the Directory filtered by it,
 * then «كل المناطق». Skeletons while it loads; a failure with one retry.
 */
export function AreaCards({ headingRef }: { headingRef: Ref<HTMLHeadingElement> }) {
  const headingId = useId();
  const areas = useAreaCards();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 ref={headingRef} id={headingId} tabIndex={-1} className="text-heading-2 outline-none">
        {areas.title}
      </h2>
      {areas.state === 'failed' ? (
        <Alert variant="destructive">
          <AlertTitle>{areas.failed}</AlertTitle>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={areas.retry.run}>
              {areas.retry.label}
            </Button>
          </AlertAction>
        </Alert>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {areas.state === 'loading'
            ? SKELETONS.map((key) => <Skeleton key={key} aria-hidden className="h-20 w-full" />)
            : areas.cards.map((card) => (
                <Link
                  key={card.key}
                  to={card.to}
                  className="block h-full rounded-lg text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Card className="h-full hover:bg-accent">
                    <CardHeader>
                      <CardTitle>
                        <h3>{card.title}</h3>
                      </CardTitle>
                      <CardDescription>{card.line}</CardDescription>
                      <CardAction>
                        <ArrowEndIcon aria-hidden className="text-muted-foreground" />
                      </CardAction>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
        </div>
      )}
    </section>
  );
}
