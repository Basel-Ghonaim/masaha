import { Field, RadioGroup, RadioGroupItem } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type RadioGroupSamples = {
  title: string;
  caption: string;
  plan: { label: string; helper: string; options: string[]; unavailable: number };
  invalid: { label: string; error: string; options: string[] };
};

const FIELD_WIDTH = 'w-full max-w-80';

// Values come from position: every fixture string is searched for in the build, so fixtures hold
// phrases only.
function Options({ options, unavailable }: { options: string[]; unavailable?: number }) {
  return options.map((label, index) => (
    <Field key={label} label={label} orientation="horizontal">
      <RadioGroupItem value={String(index)} disabled={index === unavailable} />
    </Field>
  ));
}

export function RadioGroupSection({ samples }: { samples: RadioGroupSamples }) {
  const { plan, invalid } = samples;
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Field label={plan.label} helper={plan.helper} className={FIELD_WIDTH}>
          <RadioGroup defaultValue="0">
            <Options options={plan.options} unavailable={plan.unavailable} />
          </RadioGroup>
        </Field>
        <Field label={invalid.label} error={invalid.error} className={FIELD_WIDTH}>
          <RadioGroup>
            <Options options={invalid.options} />
          </RadioGroup>
        </Field>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
