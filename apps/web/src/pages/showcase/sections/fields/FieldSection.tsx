import { Field, Input } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type FieldSamples = {
  title: string;
  caption: string;
  extrasCaption: string;
  helper: { label: string; helper: string };
  error: { label: string; error: string };
  both: { label: string; helper: string; error: string };
  labelEnd: { label: string; link: string; helper: string };
  disabled: { label: string; helper: string; value: string };
};

const FIELD_WIDTH = 'w-full max-w-80';

export function FieldSection({ samples }: { samples: FieldSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Field label={samples.helper.label} helper={samples.helper.helper} className={FIELD_WIDTH}>
          <Input />
        </Field>
        <Field label={samples.error.label} error={samples.error.error} className={FIELD_WIDTH}>
          <Input />
        </Field>
        <Field
          label={samples.both.label}
          helper={samples.both.helper}
          error={samples.both.error}
          className={FIELD_WIDTH}
        >
          <Input />
        </Field>
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.extrasCaption}>
        <Field
          label={samples.labelEnd.label}
          labelEnd={
            <a
              href="#field"
              className="text-caption text-primary underline-offset-4 hover:underline"
            >
              {samples.labelEnd.link}
            </a>
          }
          helper={samples.labelEnd.helper}
          className={FIELD_WIDTH}
        >
          <Input type="password" dir="ltr" />
        </Field>
        <Field
          label={samples.disabled.label}
          helper={samples.disabled.helper}
          className={FIELD_WIDTH}
        >
          <Input type="email" dir="ltr" defaultValue={samples.disabled.value} disabled />
        </Field>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
