import { Alert, AlertDescription, AlertTitle } from '@shared/design-system';
import type { SubscriptionSheetView } from '../../hooks/sheet/useSubscriptionSheet';

/**
 * What the customer owes from before (K3): the total in the title, each item with what it still
 * owes, and how the server applies what is received — first to those, then to the new subscription
 * (decision 3: the parts are said after, from the answer).
 */
export function PriorDebts({ prior }: { prior: NonNullable<SubscriptionSheetView['prior']> }) {
  return (
    // A warning (G16.3): what the desk receives goes to these first.
    <Alert variant="warning">
      <AlertTitle>{prior.title}</AlertTitle>
      <AlertDescription>
        {prior.items.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {prior.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        <p>{prior.note}</p>
      </AlertDescription>
    </Alert>
  );
}
