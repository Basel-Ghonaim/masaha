import { Alert, AlertDescription, AlertTitle, Button, Skeleton } from '@shared/design-system';
import { useSpaceSettingsCards } from '../hooks/useSpaceSettingsCards';
import { PricingCard } from './pricing/PricingCard';
import { ReceptionCard } from './reception/ReceptionCard';
import { ReminderCard } from './reminder/ReminderCard';

/**
 * The space's settings, a card each: visit pricing, its description leading to Packages & prices
 * (`pricesLink`), reception, and the debt reminder, its preview naming the space (`spaceName`).
 * While the settings load, a placeholder stands for each card; if they cannot be read, one alert
 * says so, with its reference and «إعادة المحاولة».
 */
export function SpaceSettingsCards({
  spaceId,
  pricesLink,
  spaceName,
}: {
  spaceId: number;
  pricesLink: string;
  spaceName: string;
}) {
  const cards = useSpaceSettingsCards(spaceId);

  if (cards.status === 'loading') {
    return (
      <div role="status" className="flex flex-col gap-6">
        <span className="sr-only">{cards.loadingLabel}</span>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (cards.status === 'error') {
    const { failure } = cards;
    return (
      <Alert variant="destructive">
        <AlertTitle>{failure.title}</AlertTitle>
        <AlertDescription>
          <p>{failure.message}</p>
          {failure.reference !== undefined && <p>{failure.reference}</p>}
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            disabled={failure.blocked}
            onClick={failure.retry}
          >
            {failure.retryLabel}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <PricingCard spaceId={spaceId} settings={cards.settings} pricesLink={pricesLink} />
      <ReceptionCard spaceId={spaceId} settings={cards.settings} />
      <ReminderCard spaceId={spaceId} settings={cards.settings} spaceName={spaceName} />
    </div>
  );
}
