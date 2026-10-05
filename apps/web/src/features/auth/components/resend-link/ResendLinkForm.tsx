import { Button } from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useResendLinkForm } from '../../hooks/resend-link/useResendLinkForm';

/** Another link, asked for by the recovery: the button, its wait as a clock, and why it failed. */
export function ResendLinkForm() {
  const { submit, isPending, disabled, label, failure } = useResendLinkForm();

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {failure && <FormFailure view={failure} />}
      <Button
        type="submit"
        variant="outline"
        className="w-full"
        loading={isPending}
        disabled={disabled}
      >
        {label}
      </Button>
    </form>
  );
}
