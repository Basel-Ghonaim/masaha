import { Checkbox, Field } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';

type CheckboxSamples = {
  title: string;
  caption: string;
  unchecked: string;
  checked: string;
  withHelper: { label: string; helper: string };
  disabled: string;
  disabledChecked: string;
  invalid: { label: string; error: string };
};

const FIELD_WIDTH = 'w-full max-w-80';

export function CheckboxSection({ samples }: { samples: CheckboxSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Field label={samples.unchecked} orientation="horizontal" className={FIELD_WIDTH}>
          <Checkbox />
        </Field>
        <Field label={samples.checked} orientation="horizontal" className={FIELD_WIDTH}>
          <Checkbox defaultChecked />
        </Field>
        <Field
          label={samples.withHelper.label}
          helper={samples.withHelper.helper}
          orientation="horizontal"
          className={FIELD_WIDTH}
        >
          <Checkbox />
        </Field>
        <Field label={samples.disabled} orientation="horizontal" className={FIELD_WIDTH}>
          <Checkbox disabled />
        </Field>
        <Field label={samples.disabledChecked} orientation="horizontal" className={FIELD_WIDTH}>
          <Checkbox disabled defaultChecked />
        </Field>
        <Field
          label={samples.invalid.label}
          error={samples.invalid.error}
          orientation="horizontal"
          className={FIELD_WIDTH}
        >
          <Checkbox />
        </Field>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
