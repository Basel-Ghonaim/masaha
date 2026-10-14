import type { AdminSpace } from '@masaha/shared/spaces';
import { useReadOnlyPrices } from '../../hooks/prices/useReadOnlyPrices';
import { ReadOnlyCard } from '../editor/ReadOnlyCard';
import { ReadOnlyItem } from '../editor/ReadOnlyRows';

/** «الأسعار» of a verified space, to read: every price by its period, audience, shift and label. */
export function ReadOnlyPrices({ space }: { space: AdminSpace }) {
  const view = useReadOnlyPrices(space);

  return (
    <ReadOnlyCard id="prices" title={view.title}>
      {view.none !== null ? (
        <p className="text-body-sm text-muted-foreground">{view.none}</p>
      ) : (
        <dl className="flex flex-col divide-y divide-border">
          {view.prices.map((price) => (
            <ReadOnlyItem key={price.key} label={price.label}>
              <span dir="ltr">{price.value}</span>
            </ReadOnlyItem>
          ))}
        </dl>
      )}
    </ReadOnlyCard>
  );
}
