import { Separator } from '@shared/design-system';
import { Fragment } from 'react';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type SeparatorSamples = {
  title: string;
  horizontalCaption: string;
  above: string;
  below: string;
  verticalCaption: string;
  items: string[];
};

export function SeparatorSection({ samples }: { samples: SeparatorSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.horizontalCaption}>
        <div className="flex w-full max-w-80 flex-col gap-3">
          <p>{samples.above}</p>
          <Separator />
          <p>{samples.below}</p>
        </div>
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.verticalCaption}>
        <div className="flex h-6 items-center gap-3">
          {samples.items.map((item, index) => (
            <Fragment key={item}>
              {index > 0 && <Separator orientation="vertical" />}
              <span>{item}</span>
            </Fragment>
          ))}
        </div>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
