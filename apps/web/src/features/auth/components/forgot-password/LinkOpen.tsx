import { useCopy } from '@shared/copy';
import { Button, CardContent } from '@shared/design-system';
import type { ReactNode } from 'react';

/** A link is open in this browser: on to the new password, or a new link instead. */
export function LinkOpen({
  resetPasswordLink,
  enterEmailAgain,
}: {
  resetPasswordLink: ReactNode;
  enterEmailAgain: () => void;
}) {
  const copy = useCopy();

  return (
    <CardContent className="gap-2">
      {resetPasswordLink}
      <Button variant="outline" className="w-full" onClick={enterEmailAgain}>
        {copy.auth.forgotPassword.enterEmailAgain}
      </Button>
    </CardContent>
  );
}
