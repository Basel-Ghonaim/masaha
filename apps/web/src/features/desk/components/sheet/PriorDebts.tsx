import type { SubscriptionSheetView } from '../../hooks/sheet/useSubscriptionSheet';

/**
 * What the customer owes from before (K3): the total in the title, each item with what it still
 * owes, and how the server applies what is received — first to those, then to the new subscription
 * (decision 3: the parts are said after, from the answer).
 */
export function PriorDebts({ prior }: { prior: NonNullable<SubscriptionSheetView['prior']> }) {
  return (
    <section className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
      <h3 className="text-label">{prior.title}</h3>
      {prior.items.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-body-sm text-muted-foreground">
          {prior.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <p className="text-caption text-muted-foreground">{prior.note}</p>
    </section>
  );
}
