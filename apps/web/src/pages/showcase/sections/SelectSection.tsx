import {
  Field,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@shared/design-system';
import { Fragment } from 'react';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';

type SelectSamples = {
  title: string;
  caption: string;
  placeholder: string;
  empty: string;
  chosen: string;
  disabled: string;
  invalid: { label: string; error: string };
  groups: { label: string; options: string[] }[];
};

const FIELD_WIDTH = 'w-full max-w-80';

// Values come from position: every fixture string is searched for in the build, so fixtures hold
// phrases only. The last option of the last group is unavailable, to show a disabled item.
function AreaSelect({
  samples,
  defaultValue,
  disabled,
}: {
  samples: SelectSamples;
  defaultValue?: string;
  disabled?: boolean;
}) {
  const lastGroup = samples.groups.length - 1;
  return (
    <Select defaultValue={defaultValue} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={samples.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {samples.groups.map((group, groupIndex) => (
          <Fragment key={group.label}>
            {groupIndex > 0 && <SelectSeparator />}
            <SelectGroup>
              <SelectLabel>{group.label}</SelectLabel>
              {group.options.map((option, index) => (
                <SelectItem
                  key={option}
                  value={`${String(groupIndex)}-${String(index)}`}
                  disabled={groupIndex === lastGroup && index === group.options.length - 1}
                >
                  {option}
                </SelectItem>
              ))}
            </SelectGroup>
          </Fragment>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SelectSection({ samples }: { samples: SelectSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Field label={samples.empty} className={FIELD_WIDTH}>
          <AreaSelect samples={samples} />
        </Field>
        <Field label={samples.chosen} className={FIELD_WIDTH}>
          <AreaSelect samples={samples} defaultValue="0-1" />
        </Field>
        <Field label={samples.disabled} className={FIELD_WIDTH}>
          <AreaSelect samples={samples} defaultValue="1-0" disabled />
        </Field>
        <Field label={samples.invalid.label} error={samples.invalid.error} className={FIELD_WIDTH}>
          <AreaSelect samples={samples} />
        </Field>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
