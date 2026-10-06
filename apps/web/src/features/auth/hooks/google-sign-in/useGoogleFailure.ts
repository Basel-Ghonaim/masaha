import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView, type FormFailureView } from '@shared/forms';

/**
 * Why Google sign-in failed, as its failure area shows it: a refusal reads as `useRefusalView` reads
 * it (too many attempts counts down), in Google's own line where it has one, else the failure's; and
 * Google's script that could not load has a line of its own. Closing Google's window is no failure:
 * no answer comes, so nothing shows.
 */
export function useGoogleFailure(
  error: AppError | null,
  scriptFailed: boolean,
): { view: FormFailureView | null; blocked: boolean } {
  const copy = useCopy();
  const google = copy.auth.google;
  const refusal = useRefusalView(error, google.failed);

  if (scriptFailed) {
    return {
      view: { kind: 'refused', title: google.failed, message: google.scriptFailed },
      blocked: false,
    };
  }

  const ownLines: Partial<Record<string, string>> = google.lines;
  const own = error === null ? undefined : ownLines[error.code ?? error.type];
  if (refusal.view?.kind !== 'refused' || own === undefined) {
    return refusal;
  }
  return { view: { ...refusal.view, message: own }, blocked: refusal.blocked };
}
