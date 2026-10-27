import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import { useId } from 'react';
import { useEndDialog } from '../../hooks/end/useEndDialog';
import type { SubscriptionCardView } from '../../hooks/file/useCustomerFile';
import { useStatement } from '../../hooks/statement/useStatement';
import { EndDialog } from '../end/EndDialog';
import { Statement } from '../statement/Statement';

/**
 * One subscription in the file (DI-42): its name, the card's `h3` under «الاشتراكات», with «سعر
 * يدوي» when its price was typed; its dates and its terms in one line; its status and payment
 * badges; its progress, a plain line each; its due, paid and left, the server's; and «استلام
 * المتبقي» while it owes (DI-44); «عرض الكشف» opens its statement inside it (DI-43), and «إنهاء
 * الاشتراك» ends it early, asking first; «تجديد» (`renew`, the latest's) opens the page's sheet for
 * its renewal. `opened` hears which control opened the payment.
 */
export function SubscriptionCard({
  spaceId,
  card,
  opened,
  renew,
}: {
  spaceId: number;
  card: SubscriptionCardView;
  opened: (trigger: HTMLElement) => void;
  /** «تجديد», offered on the latest subscription. */
  renew: { label: string; run: (from: HTMLElement) => void } | null;
}) {
  const { money } = card;
  const statement = useStatement(spaceId, card.subscription.id);
  const end = useEndDialog({ spaceId, subscription: card.subscription });
  const statementId = useId();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {/* The name keeps its own direction inline, so the heading stays at the start (PR 1b). */}
          <h3>
            <span dir="auto">{card.title.name}</span>
          </h3>
        </CardTitle>
        <CardDescription className="flex flex-col gap-1">
          {card.dates !== null && <span>{card.dates}</span>}
          <span>{card.terms}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={card.badges.status.tone}>{card.badges.status.label}</Badge>
          <Badge variant={card.badges.pay.tone}>{card.badges.pay.label}</Badge>
          {card.title.typed !== null && <Badge variant="neutral">{card.title.typed}</Badge>}
        </div>
        <ul className="flex flex-col gap-1 text-caption text-muted-foreground">
          {card.progress.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <dl className="grid grid-cols-3 gap-2 text-body-sm">
          <div className="flex flex-col">
            <dt className="text-caption text-muted-foreground">{money.dueLabel}</dt>
            <dd className="text-label">{money.due}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-caption text-muted-foreground">{money.paidLabel}</dt>
            <dd className="text-label">{money.paid}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-caption text-muted-foreground">{money.leftLabel}</dt>
            <dd className="text-label">{money.left}</dd>
          </div>
        </dl>
        <Statement id={statementId} statement={statement} />
      </CardContent>
      <CardFooter className="flex-wrap">
        {card.receive !== null && (
          <Button
            variant="secondary"
            onClick={(event) => {
              opened(event.currentTarget);
              card.receive?.run();
            }}
          >
            {card.receive.label}
          </Button>
        )}
        {renew !== null && (
          <Button
            variant="secondary"
            onClick={(event) => {
              renew.run(event.currentTarget);
            }}
          >
            {renew.label}
          </Button>
        )}
        <Button
          variant="ghost"
          aria-expanded={statement.toggle.expanded}
          aria-controls={statementId}
          onClick={statement.toggle.run}
        >
          {statement.toggle.label}
        </Button>
        {end.action !== null && (
          <Button variant="ghost" onClick={end.action.run}>
            {end.action.label}
          </Button>
        )}
      </CardFooter>
      <EndDialog dialog={end.dialog} />
    </Card>
  );
}
