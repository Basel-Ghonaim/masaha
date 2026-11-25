import { SignInForm } from '@features/auth';
import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import type { SignInView, ViewFocus } from '../../public/signInView';

/**
 * The sign-in over the page: the email and password form, «نسيت كلمة المرور؟» to the reset link's
 * request in place, and, at its `foot`, «جديد على مساحة؟ إنشاء حساب» to register in place.
 */
export function SignInFormView({
  email,
  onEmailChange,
  focusPassword,
  go,
  foot,
  busy,
}: {
  email: string;
  onEmailChange: (email: string) => void;
  /** The email is known: the password takes the focus as the view opens. */
  focusPassword: boolean;
  go: (view: SignInView, focus?: ViewFocus) => void;
  foot: boolean;
  /** A request is under way: the switches to another view are held. */
  busy: boolean;
}) {
  const copy = useCopy();

  return (
    <>
      <SignInForm
        defaultEmail={email}
        onEmailChange={onEmailChange}
        focus={focusPassword ? 'password' : undefined}
        forgotPasswordLink={
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0"
            disabled={busy}
            onClick={() => {
              go('forgot');
            }}
          >
            {copy.auth.signIn.forgotPassword}
          </Button>
        }
      />
      {foot && (
        <p className="flex flex-wrap items-center gap-1 border-t border-border pt-5 text-body-sm text-muted-foreground">
          {copy.site.signInPrompt.newHere}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0"
            disabled={busy}
            onClick={() => {
              go('register');
            }}
          >
            {copy.auth.signIn.createAccount}
          </Button>
        </p>
      )}
    </>
  );
}
