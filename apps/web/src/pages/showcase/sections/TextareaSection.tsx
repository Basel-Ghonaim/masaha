import { Field, Textarea } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';

type TextareaSamples = {
  title: string;
  caption: string;
  empty: { label: string; placeholder: string };
  filled: { label: string; value: string };
  disabled: { label: string; value: string };
  invalid: { label: string; error: string };
};

const FIELD_WIDTH = 'w-full max-w-80';

export function TextareaSection({ samples }: { samples: TextareaSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Field label={samples.empty.label} className={FIELD_WIDTH}>
          <Textarea placeholder={samples.empty.placeholder} />
        </Field>
        <Field label={samples.filled.label} className={FIELD_WIDTH}>
          <Textarea defaultValue={samples.filled.value} />
        </Field>
        <Field label={samples.disabled.label} className={FIELD_WIDTH}>
          <Textarea defaultValue={samples.disabled.value} disabled />
        </Field>
        <Field label={samples.invalid.label} error={samples.invalid.error} className={FIELD_WIDTH}>
          <Textarea />
        </Field>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
