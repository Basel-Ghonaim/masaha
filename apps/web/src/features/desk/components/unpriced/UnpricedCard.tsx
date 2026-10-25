import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@shared/design-system';
import { useId, useRef } from 'react';
import { useUnpricedCard } from '../../hooks/unpriced/useUnpricedCard';
import { PriceDialog } from './PriceDialog';

/**
 * «بدون سعر», under «غير محصّل», only for whoever may type a price and only while a visit waits for
 * one: a card named by its heading, which counts them, each row with «تحديد السعر» at the layer's
 * default size (DI-16). A closed dialog gives the focus back to the row's button, or — the row
 * gone — to the heading.
 */
export function UnpricedCard({
  spaceId,
  mayTypePrice,
}: {
  spaceId: number;
  mayTypePrice: boolean;
}) {
  const card = useUnpricedCard(spaceId, { mayTypePrice });
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement | null>(null);
  const trigger = useRef<HTMLElement | null>(null);

  if (!card.shown) return null;
  const returnFocus = () => {
    const last = trigger.current;
    if (last?.isConnected) last.focus();
    else heading.current?.focus();
  };
  const { dialog } = card;

  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader>
        <CardTitle>
          <h2 ref={heading} id={headingId} tabIndex={-1}>
            {card.title}
          </h2>
        </CardTitle>
      </CardHeader>
      {card.state === 'loading' ? (
        <CardContent>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      ) : card.state === 'failed' ? (
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>{card.failure.title}</AlertTitle>
            <AlertDescription>
              {card.failure.message}
              {card.failure.reference !== undefined && (
                <span className="block">{card.failure.reference}</span>
              )}
            </AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                disabled={card.failure.blocked}
                onClick={card.failure.retry}
              >
                {card.failure.retryLabel}
              </Button>
            </AlertAction>
          </Alert>
        </CardContent>
      ) : (
        <ul className="flex flex-col divide-y">
          {card.rows.map((row) => (
            <li
              key={row.key}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="self-start text-label" dir="auto">
                  {row.name}
                </span>
                <span className="text-caption text-muted-foreground">{row.how}</span>
              </div>
              <Button
                variant="outline"
                onClick={(event) => {
                  trigger.current = event.currentTarget;
                  row.price.run();
                }}
              >
                {row.price.label}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {dialog !== null && (
        <PriceDialog
          spaceId={spaceId}
          visit={dialog.visit}
          name={dialog.name}
          onClose={card.closeDialog}
          returnFocus={returnFocus}
        />
      )}
    </Card>
  );
}
