import { Field, ToggleGroup, ToggleGroupItem } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type ToggleGroupSamples = {
  title: string;
  caption: string;
  label: string;
  helper: string;
  options: string[];
  disabledLabel: string;
};

// Values come from position: every fixture string is searched for in the build, so fixtures hold
// phrases only.
export function ToggleGroupSection({ samples }: { samples: ToggleGroupSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Field label={samples.label} helper={samples.helper} className="w-full max-w-120">
          <ToggleGroup type="multiple" defaultValue={['0', '1']}>
            {samples.options.map((option, index) => (
              <ToggleGroupItem key={option} value={String(index)}>
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
        <Field label={samples.disabledLabel} className="w-full max-w-120">
          <ToggleGroup type="multiple" defaultValue={['0']}>
            {samples.options.map((option, index) => (
              <ToggleGroupItem key={option} value={String(index)} disabled={index === 0}>
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
