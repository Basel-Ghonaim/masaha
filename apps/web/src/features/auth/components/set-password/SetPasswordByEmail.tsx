import { Button } from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useSetPasswordByEmail } from '../../hooks/set-password/useSetPasswordByEmail';
import { LinkSentLines } from '../forgot-password/LinkSent';

/**
 * A signed-in account's first password, by email (screen 9, D9.2): «أرسل رابط تعيين كلمة المرور»
 * for the account's own address, held with its wait while a 429 runs; once sent, the link sent —
 * the masked address and another link with its countdown — as the forgotten password draws it.
 */
export function SetPasswordByEmail({ email }: { email: string }) {
  const view = useSetPasswordByEmail(email);

  return view.sent === null ? (
    <form noValidate onSubmit={view.submit} className="flex flex-col gap-4">
      {view.failure && <FormFailure view={view.failure} />}
      <Button
        type="submit"
        variant="outline"
        className="self-start"
        loading={view.isPending}
        disabled={view.blocked}
      >
        {view.label}
      </Button>
    </form>
  ) : (
    <LinkSentLines
      message={view.sent.message}
      sentTo={view.sent.sentTo}
      canResend={view.sent.canResend}
    />
  );
}
