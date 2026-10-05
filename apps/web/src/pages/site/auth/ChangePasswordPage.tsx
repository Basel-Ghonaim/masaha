import { ForcedPasswordChangeForm } from '@features/users';
import { useCopy } from '@shared/copy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@shared/design-system';

/**
 * The forced change of a temporary password: the card around the change form. Once it is saved,
 * `RequirePasswordChange` sends the user on to where they land.
 */
export function ChangePasswordPage() {
  const copy = useCopy();

  return (
    <Card className="w-full md:max-w-md">
      <CardHeader>
        <CardTitle>
          <h1>{copy.users.passwordChange.title}</h1>
        </CardTitle>
        <CardDescription>{copy.users.passwordChange.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ForcedPasswordChangeForm />
      </CardContent>
    </Card>
  );
}
