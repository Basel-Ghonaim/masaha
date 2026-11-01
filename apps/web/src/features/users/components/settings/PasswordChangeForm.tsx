import { useCopy } from '@shared/copy';
import { Button, Field } from '@shared/design-system';
import { FormFailure, PasswordInput, PasswordRules } from '@shared/forms';
import { useId } from 'react';
import { usePasswordChangeForm } from '../../hooks/settings/usePasswordChangeForm';

/**
 * The settings' password change, opened under «تغيير»: the current password, which takes the focus,
 * the new one with its rules, the line that the other devices are signed out (C2), «حفظ كلمة المرور»
 * and «رجوع». Saved or closed, `close` hands the focus back to «تغيير».
 */
export function PasswordChangeForm({ id, close }: { id: string; close: () => void }) {
  const words = useCopy().users.settings.passwordForm;
  const rulesId = useId();
  const { field, submit, isPending, blocked, errors, failure, passwordRules } =
    usePasswordChangeForm({ done: close });

  return (
    <form id={id} noValidate onSubmit={submit} className="flex flex-col gap-4">
      {failure && <FormFailure view={failure} />}
      <Field label={words.current} error={errors.currentPassword}>
        <PasswordInput
          autoComplete="current-password"
          // Opened by «تغيير», the form starts at its first field.
          autoFocus
          {...field('currentPassword')}
        />
      </Field>
      <div className="flex flex-col gap-2">
        <Field label={words.new} error={errors.password}>
          <PasswordInput
            autoComplete="new-password"
            aria-describedby={rulesId}
            {...field('password')}
          />
        </Field>
        <PasswordRules id={rulesId} view={passwordRules} />
      </div>
      <p className="text-body-sm text-muted-foreground">{words.othersLine}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={isPending} disabled={blocked}>
          {words.save}
        </Button>
        <Button type="button" variant="ghost" onClick={close} disabled={isPending}>
          {words.back}
        </Button>
      </div>
    </form>
  );
}
