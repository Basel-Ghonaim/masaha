import { useCopy } from '@shared/copy';
import { Button, CardContent } from '@shared/design-system';

/** A link is open in this browser: a new link instead. */
export function LinkOpen({ enterEmailAgain }: { enterEmailAgain: () => void }) {
  const copy = useCopy();

  return (
    <CardContent className="gap-2">
      <Button variant="outline" className="w-full" onClick={enterEmailAgain}>
        {copy.auth.forgotPassword.enterEmailAgain}
      </Button>
    </CardContent>
  );
}
