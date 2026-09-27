import { Spinner } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';

type SpinnerSamples = {
  title: string;
  caption: string;
  label: string;
  text: string;
};

export function SpinnerSection({ samples }: { samples: SpinnerSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Spinner label={samples.label} />
        <Spinner label={samples.label} className="[&_svg]:size-6" />
        <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
          <Spinner label={samples.label} />
          <span aria-hidden>{samples.text}</span>
        </div>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
