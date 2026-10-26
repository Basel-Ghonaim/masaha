import type { CustomerRow } from '@masaha/shared/desk';
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import { useRef, type RefObject } from 'react';
import { useCustomerCard } from '../../hooks/card/useCustomerCard';
import type { PayTarget } from '../../hooks/pay/usePayDialog';
import { useSubscriberCheckIn } from '../../hooks/subscriber/useSubscriberCheckIn';
import type { OpenSheet } from '../../types/SheetEntry';
import { CustomerActions } from '../menu/CustomerActions';
import { PreCheckInDialog } from '../subscriber/PreCheckInDialog';
import { BalanceBadge } from './BalanceBadge';

/**
 * A customer found by the desk's search: their name, the card's `h3` under its group's `h2` (DI-38),
 * their phone left to right, their current subscription with its status and its end, and their
 * balance (DI-40); then «حضور», named by them, at the layer's default size (DI-16), with its choice
 * first when the row questions the subscription (DI-14), and «استلام {المبلغ}» while they owe; their «⋯» in its corner. Done, `after.done` runs and the focus goes
 * to `after.focus` (the search, S10); the choice dismissed, back to «حضور».
 */
export function CustomerCard({
  spaceId,
  row,
  after,
  receive,
  menu,
}: {
  spaceId: number;
  row: CustomerRow;
  /**
   * The card's «⋯»: whether the caller is the owner (S5), where a customer's file is, and the page's
   * subscription sheet.
   */
  menu: {
    owner: boolean;
    fileLink: (customerId: number) => string;
    subscribe: OpenSheet;
  };
  after: { done: () => void; focus: RefObject<HTMLElement | null> };
  /** Opens the payment on one of the customer's items. */
  receive: (target: PayTarget) => void;
}) {
  const card = useCustomerCard(row);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const succeeded = useRef(false);
  const checkIn = useSubscriberCheckIn(spaceId, row, {
    done: () => {
      succeeded.current = true;
      after.done();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {/* The name keeps its own direction inline, so the heading stays at the start (PR 1b). */}
          <h3>
            <span dir="auto">{card.name}</span>
          </h3>
        </CardTitle>
        <CardDescription>
          {card.phone.number ? <span dir="ltr">{card.phone.text}</span> : card.phone.text}
        </CardDescription>
        <CardAction>
          <CustomerActions
            spaceId={spaceId}
            customer={row}
            debtAgorot={row.debtAgorot}
            owner={menu.owner}
            fileLink={menu.fileLink(row.id)}
            subscribe={menu.subscribe}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {card.subscription === null ? (
          <span className="text-body-sm text-muted-foreground">{card.noSubscription}</span>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-body-sm">
            <span dir="auto">{card.subscription.name}</span>
            <Badge variant={card.subscription.status.tone}>{card.subscription.status.label}</Badge>
            <span className="text-muted-foreground">{card.subscription.until}</span>
          </div>
        )}
        <div>
          <BalanceBadge balance={card.balance} />
        </div>
      </CardContent>
      <CardFooter className="flex-wrap">
        <Button
          ref={trigger}
          aria-label={checkIn.tap.name}
          loading={checkIn.tap.busy}
          onClick={() => {
            succeeded.current = false;
            checkIn.tap.run();
          }}
        >
          {checkIn.tap.label}
        </Button>
        {card.receive !== null && (
          <Button
            variant="secondary"
            onClick={() => {
              receive({ customerId: row.id });
            }}
          >
            {card.receive}
          </Button>
        )}
      </CardFooter>
      <PreCheckInDialog
        dialog={checkIn.dialog}
        focusAfter={() => (succeeded.current ? after.focus.current : trigger.current)}
      />
    </Card>
  );
}
