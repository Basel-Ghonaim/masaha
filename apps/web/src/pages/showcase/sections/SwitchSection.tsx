import { Field, Switch } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';

type SwitchSamples = {
  title: string;
  caption: string;
  off: string;
  on: { label: string; helper: string };
  disabled: string;
  disabledOn: string;
};

const FIELD_WIDTH = 'w-full max-w-80';

export function SwitchSection({ samples }: { samples: SwitchSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Field label={samples.off} orientation="horizontal" className={FIELD_WIDTH}>
          <Switch />
        </Field>
        <Field
          label={samples.on.label}
          helper={samples.on.helper}
          orientation="horizontal"
          className={FIELD_WIDTH}
        >
          <Switch defaultChecked />
        </Field>
        <Field label={samples.disabled} orientation="horizontal" className={FIELD_WIDTH}>
          <Switch disabled />
        </Field>
        <Field label={samples.disabledOn} orientation="horizontal" className={FIELD_WIDTH}>
          <Switch disabled defaultChecked />
        </Field>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
