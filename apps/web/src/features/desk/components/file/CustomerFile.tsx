import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  EmptyState,
  Skeleton,
} from '@shared/design-system';
import { useId, useRef } from 'react';
import { useCustomerFile } from '../../hooks/file/useCustomerFile';
import { CustomerActions } from '../menu/CustomerActions';
import { PayDialog } from '../pay/PayDialog';
import { FileHeader } from './FileHeader';
import { SubscriptionCard } from './SubscriptionCard';
import { UnpaidVisits } from './UnpaidVisits';

/** No one is picked in a dialog opened on a named customer: the picker is not shown. */
const NO_ONE_PRESENT: ReadonlySet<number> = new Set();

/**
 * A customer's file (screen 15), below the page's title — the customer's name: the header; the
 * unpaid visits; then «الاشتراكات», each a card (DI-42) in a grid of one, two, then three columns.
 * No tabs (DI-43): the API holds no paid visits nor attendance across subscriptions. Its own loading,
 * failure (with its reference and a retry) and not-found states. «تحصيل» and «استلام المتبقي» open
 * the payment on their item, and the closed dialog gives the focus back to the control that opened
 * it.
 */
export function CustomerFile({
  spaceId,
  customerId,
  owner,
}: {
  spaceId: number;
  customerId: number;
  /** The owner's header offers the archive and the restore; the server decides (S5). */
  owner: boolean;
}) {
  const file = useCustomerFile(spaceId, customerId);
  const headingId = useId();
  const trigger = useRef<HTMLElement | null>(null);
  const opened = (element: HTMLElement) => {
    trigger.current = element;
  };

  if (file.state === 'loading') {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (file.state === 'notFound') {
    return <EmptyState title={file.notFound.title} description={file.notFound.text} />;
  }
  if (file.state === 'failed' || file.header === null) {
    const { failure } = file;
    return (
      <Alert variant="destructive">
        <AlertTitle>{failure.title}</AlertTitle>
        <AlertDescription>
          {failure.message}
          {failure.reference !== undefined && <span className="block">{failure.reference}</span>}
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" disabled={failure.blocked} onClick={failure.retry}>
            {failure.retryLabel}
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  const { subscriptions } = file;
  return (
    <div className="flex flex-col gap-6">
      <FileHeader
        header={file.header}
        actions={
          <CustomerActions
            spaceId={spaceId}
            customer={file.header.customer}
            debtAgorot={file.header.debtAgorot}
            owner={owner}
            fileLink={null}
          />
        }
      />
      {file.unpaid !== null && <UnpaidVisits unpaid={file.unpaid} opened={opened} />}
      <section aria-labelledby={headingId} className="flex flex-col gap-4">
        <h2 id={headingId} className="text-heading-3">
          {subscriptions.title}
        </h2>
        {subscriptions.none !== null ? (
          <EmptyState title={subscriptions.none.title} description={subscriptions.none.text} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {subscriptions.cards.map((card) => (
              <SubscriptionCard key={card.key} card={card} opened={opened} />
            ))}
          </div>
        )}
      </section>
      {file.pay !== null && (
        // Each opening is a new intent: a new dialog, a new key (S4).
        <PayDialog
          key={file.payOpening}
          spaceId={spaceId}
          target={file.pay}
          presentIds={NO_ONE_PRESENT}
          onClose={file.closePay}
          returnFocus={() => (trigger.current?.isConnected === true ? trigger.current : null)}
        />
      )}
    </div>
  );
}
