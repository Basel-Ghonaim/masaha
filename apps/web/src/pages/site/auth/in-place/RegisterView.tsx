import { RegisterForm } from '@features/auth';
import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import type { SignInView, ViewFocus } from '../../public/signInView';
import { PrivacyLine } from './PrivacyLine';

/**
 * Register over the page: the form, its email carried from the sign-in; «سجّل الدخول بهذا البريد»
 * once the address has an account, to the sign-in with it filled and the password focused; the
 * privacy policy in a new tab, so the held action stays on this one; and «لديك حساب؟ تسجيل الدخول».
 */
export function RegisterView({
  email,
  onEmailChange,
  go,
  busy,
}: {
  email: string;
  onEmailChange: (email: string) => void;
  go: (view: SignInView, focus?: ViewFocus) => void;
  /** A request is under way: the switches to another view are held. */
  busy: boolean;
}) {
  const copy = useCopy();
  const words = copy.auth.register;

  return (
    <>
      <RegisterForm
        defaultEmail={email}
        onEmailChange={onEmailChange}
        signInLink={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              go('signIn', 'form');
            }}
          >
            {words.signInInstead}
          </Button>
        }
      />
      <PrivacyLine />
      <p className="flex flex-wrap items-center gap-1 border-t border-border pt-5 text-body-sm text-muted-foreground">
        {words.haveAccount}
        <Button
          type="button"
          variant="link"
          size="sm"
          className="px-0"
          disabled={busy}
          onClick={() => {
            go('signIn');
          }}
        >
          {words.signIn}
        </Button>
      </p>
    </>
  );
}
