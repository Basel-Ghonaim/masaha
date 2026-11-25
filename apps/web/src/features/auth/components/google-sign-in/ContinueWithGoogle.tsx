import { FormFailure } from '@shared/forms';
import type { ReactNode } from 'react';
import { useContinueWithGoogle } from '../../hooks/google-sign-in/useContinueWithGoogle';

export type ContinueWithGoogleProps = {
  /** What separates Google from the form below it, shown only when Google sign-in is offered. */
  divider?: ReactNode;
  /**
   * The way on when Google refused to join an account that already has this email (a reset link,
   * for one), shown in that refusal's alert.
   */
  linkRefusedAction?: ReactNode;
};

/**
 * Google's own button and why a Google sign-in failed, above it, all from `useContinueWithGoogle`.
 * Without Google sign-in configured, nothing at all. The session it opens is held as a sign-in.
 */
export function ContinueWithGoogle({ divider, linkRefusedAction }: ContinueWithGoogleProps) {
  const { available, buttonRef, showButton, failure, busy, linkRefused } = useContinueWithGoogle();

  if (!available) return null;

  return (
    <div className="flex flex-col gap-4">
      {failure && (
        <FormFailure view={failure} action={linkRefused ? linkRefusedAction : undefined} />
      )}
      {showButton && (
        <div
          ref={buttonRef}
          inert={busy}
          aria-busy={busy}
          className="flex min-h-10 justify-center aria-busy:opacity-50"
        />
      )}
      {divider}
    </div>
  );
}
