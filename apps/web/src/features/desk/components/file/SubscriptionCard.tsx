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
import type { SubscriptionCardView } from '../../hooks/file/useCustomerFile';

/**
 * One subscription in the file (DI-42): its name, the card's `h3` under «الاشتراكات», with «سعر
 * يدوي» when its price was typed; its dates and its terms in one line; its status and payment
 * badges; its progress, a plain line each; its due, paid and left, the server's; and «استلام
 * المتبقي» while it owes (DI-44). `opened` hears which control opened the payment.
 */
export function SubscriptionCard({
  card,
  opened,
}: {
  card: SubscriptionCardView;
  opened: (trigger: HTMLElement) => void;
}) {
  const { money } = card;

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
      </CardContent>
      {card.receive !== null && (
        <CardFooter>
          <Button
            variant="secondary"
            onClick={(event) => {
              opened(event.currentTarget);
              card.receive?.run();
            }}
          >
            {card.receive.label}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
