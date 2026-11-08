import { Field, SegmentedControl, SegmentedControlItem } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type SegmentedControlSamples = {
  title: string;
  caption: string;
  label: string;
  helper: string;
  options: string[];
};

// Values come from position: every fixture string is searched for in the build, so fixtures hold
// phrases only.
export function SegmentedControlSection({ samples }: { samples: SegmentedControlSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Field label={samples.label} helper={samples.helper} className="w-full max-w-120">
          <SegmentedControl defaultValue="1">
            {samples.options.map((option, index) => (
              <SegmentedControlItem key={option} value={String(index)}>
                {option}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </Field>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
