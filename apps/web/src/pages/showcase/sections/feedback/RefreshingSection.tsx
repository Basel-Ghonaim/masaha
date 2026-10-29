import { Card, Refreshing } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type RefreshingSamples = {
  title: string;
  restingCaption: string;
  refreshingCaption: string;
  list: string;
  cards: string[];
};

function Cards({ samples, refreshing }: { samples: RefreshingSamples; refreshing: boolean }) {
  return (
    <Refreshing refreshing={refreshing} className="w-full max-w-sm">
      <ul aria-label={samples.list} className="flex flex-col gap-2">
        {samples.cards.map((card) => (
          <li key={card}>
            <Card className="px-5 py-3 text-body-sm">{card}</Card>
          </li>
        ))}
      </ul>
    </Refreshing>
  );
}

export function RefreshingSection({ samples }: { samples: RefreshingSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.restingCaption}>
        <Cards samples={samples} refreshing={false} />
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.refreshingCaption}>
        <Cards samples={samples} refreshing />
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
