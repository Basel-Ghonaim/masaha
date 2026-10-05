import { useCopy } from '@shared/copy';
import { EyeIcon, EyeOffIcon, Input, InputAction, type InputProps } from '@shared/design-system';
import { useState } from 'react';

export type PasswordInputProps = Omit<InputProps, 'type' | 'dir' | 'action'>;

/**
 * A password field's control: the layer's Input, left to right in either language, with a button
 * that shows and hides what was typed. Inside a Field it takes the Field's label and error.
 */
export function PasswordInput(props: PasswordInputProps) {
  const copy = useCopy();
  const [shown, setShown] = useState(false);

  return (
    <Input
      {...props}
      type={shown ? 'text' : 'password'}
      dir="ltr"
      action={
        <InputAction
          label={shown ? copy.forms.password.hide : copy.forms.password.show}
          icon={shown ? <EyeOffIcon /> : <EyeIcon />}
          disabled={props.disabled}
          onClick={() => {
            setShown(!shown);
          }}
        />
      }
    />
  );
}
