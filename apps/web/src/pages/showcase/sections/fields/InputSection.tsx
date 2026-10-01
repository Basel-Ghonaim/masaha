import {
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
  Field,
  Input,
  InputAction,
  SearchIcon,
  XIcon,
} from '@shared/design-system';
import { useState } from 'react';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type InputSamples = {
  title: string;
  statesCaption: string;
  directionCaption: string;
  slotsCaption: string;
  empty: { label: string; placeholder: string };
  filled: { label: string; value: string };
  disabled: { label: string; value: string };
  invalid: { label: string; value: string; error: string };
  email: { label: string; placeholder: string };
  phone: { label: string; value: string };
  search: { label: string; placeholder: string; value: string; clear: string };
  password: { label: string; value: string; show: string; hide: string };
  wrongEmail: { label: string; value: string; error: string };
};

const FIELD_WIDTH = 'w-full max-w-80';

function SearchField({ samples }: { samples: InputSamples['search'] }) {
  const [query, setQuery] = useState(samples.value);
  return (
    <Field label={samples.label} className={FIELD_WIDTH}>
      <Input
        type="search"
        value={query}
        placeholder={samples.placeholder}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
        startIcon={<SearchIcon />}
        action={
          query === '' ? undefined : (
            <InputAction
              label={samples.clear}
              icon={<XIcon />}
              onClick={() => {
                setQuery('');
              }}
            />
          )
        }
      />
    </Field>
  );
}

function PasswordField({ samples }: { samples: InputSamples['password'] }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={samples.label} className={FIELD_WIDTH}>
      <Input
        type={visible ? 'text' : 'password'}
        dir="ltr"
        defaultValue={samples.value}
        action={
          <InputAction
            label={visible ? samples.hide : samples.show}
            icon={visible ? <EyeOffIcon /> : <EyeIcon />}
            onClick={() => {
              setVisible(!visible);
            }}
          />
        }
      />
    </Field>
  );
}

export function InputSection({ samples }: { samples: InputSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.statesCaption}>
        <Field label={samples.empty.label} className={FIELD_WIDTH}>
          <Input placeholder={samples.empty.placeholder} />
        </Field>
        <Field label={samples.filled.label} className={FIELD_WIDTH}>
          <Input defaultValue={samples.filled.value} />
        </Field>
        <Field label={samples.disabled.label} className={FIELD_WIDTH}>
          <Input defaultValue={samples.disabled.value} disabled />
        </Field>
        <Field label={samples.invalid.label} error={samples.invalid.error} className={FIELD_WIDTH}>
          <Input defaultValue={samples.invalid.value} />
        </Field>
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.slotsCaption}>
        <SearchField samples={samples.search} />
        <PasswordField samples={samples.password} />
        <Field
          label={samples.wrongEmail.label}
          error={samples.wrongEmail.error}
          className={FIELD_WIDTH}
        >
          <Input
            type="email"
            dir="ltr"
            defaultValue={samples.wrongEmail.value}
            endIcon={<CircleAlertIcon className="text-destructive" />}
          />
        </Field>
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.directionCaption}>
        <Field label={samples.email.label} className={FIELD_WIDTH}>
          <Input type="email" dir="ltr" placeholder={samples.email.placeholder} />
        </Field>
        <Field label={samples.phone.label} className={FIELD_WIDTH}>
          <Input type="tel" dir="ltr" defaultValue={samples.phone.value} />
        </Field>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
