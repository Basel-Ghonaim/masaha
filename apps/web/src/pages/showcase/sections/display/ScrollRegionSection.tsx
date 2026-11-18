import { Card, CardContent, ScrollRegion } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type ScrollRegionSamples = {
  title: string;
  overflowCaption: string;
  fitsCaption: string;
  label: string;
  fitsLabel: string;
  cards: string[];
};

function Row({ cards }: { cards: string[] }) {
  return (
    <ul className="flex w-max gap-3 p-1">
      {cards.map((card) => (
        <li key={card} className="w-40 shrink-0">
          <Card>
            <CardContent>{card}</CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

// The first strip holds more than any preview width shows, so it is a tab stop; the second fits.
export function ScrollRegionSection({ samples }: { samples: ScrollRegionSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.overflowCaption}>
        <ScrollRegion aria-label={samples.label} className="w-full">
          <Row cards={samples.cards} />
        </ScrollRegion>
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.fitsCaption}>
        <ScrollRegion aria-label={samples.fitsLabel} className="w-full">
          <Row cards={samples.cards.slice(0, 2)} />
        </ScrollRegion>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
