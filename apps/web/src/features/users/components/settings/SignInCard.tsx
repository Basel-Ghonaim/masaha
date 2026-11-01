import type { MyAccount } from '@masaha/shared/users';
import { useCopy } from '@shared/copy';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from '@shared/design-system';
import { isolate } from '@shared/localisation';
import { useId, useRef, useState, type ReactNode } from 'react';
import { PasswordChangeForm } from './PasswordChangeForm';

/**
 * «تسجيل الدخول»: the ways one signs in. With Google, its row and «مربوط»; then the password's row:
 * with a password, «تغيير» opens the change under it (the focus in its first field, back on «تغيير»
 * once it closes); without one (Google only, C1), «لم تُعيَّن بعد» and the link to set one by email,
 * which the page sets (`setPassword`, `auth`'s link sent with its resend and its wait, D9.2).
 */
export function SignInCard({
  account,
  setPassword,
}: {
  account: MyAccount;
  /** The link to set a first password for the account's address, as the page draws it. */
  setPassword: (email: string) => ReactNode;
}) {
  const words = useCopy().users.settings.signIn;
  const formId = useId();
  const changeButton = useRef<HTMLButtonElement>(null);
  const [changing, setChanging] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{words.title}</h2>
        </CardTitle>
        <CardDescription>{words.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {account.hasGoogle && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-col gap-1">
                <h3 className="text-label">{words.google}</h3>
                <p className="text-body-sm text-muted-foreground">
                  {words.googleLine({ email: isolate(account.email) })}
                </p>
              </div>
              <Badge variant="success">{words.linked}</Badge>
            </div>
            <Separator />
          </>
        )}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-col gap-1">
              <h3 className="text-label">{words.password}</h3>
              <p className="text-body-sm text-muted-foreground">
                {account.hasPassword ? words.passwordLine : words.notSet}
              </p>
            </div>
            {account.hasPassword && (
              <Button
                ref={changeButton}
                variant="outline"
                size="sm"
                aria-expanded={changing}
                aria-controls={formId}
                onClick={() => {
                  setChanging(true);
                }}
              >
                {words.change}
              </Button>
            )}
          </div>
          {account.hasPassword && changing && (
            <PasswordChangeForm
              id={formId}
              close={() => {
                setChanging(false);
                changeButton.current?.focus();
              }}
            />
          )}
          {!account.hasPassword && (
            <div className="flex flex-col gap-2">
              <p className="text-body-sm">{words.setLine}</p>
              {setPassword(account.email)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
