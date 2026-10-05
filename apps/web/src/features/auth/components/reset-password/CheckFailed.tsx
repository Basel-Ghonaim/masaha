import { useCopy } from '@shared/copy';
import { CardContent } from '@shared/design-system';
import { FormFailure, type FormFailureView } from '@shared/forms';

/**
 * The link's check was answered with no verdict on the link: why, while there is something to say,
 * and to open the link again.
 */
export function CheckFailed({ failure }: { failure: FormFailureView | null }) {
  const copy = useCopy();

  return (
    <CardContent className="gap-4">
      {failure && <FormFailure view={failure} />}
      <p className="text-body-sm">{copy.auth.resetPassword.reopenLink}</p>
    </CardContent>
  );
}
