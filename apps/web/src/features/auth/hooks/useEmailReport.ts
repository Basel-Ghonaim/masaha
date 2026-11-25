import { useEffect, useRef } from 'react';

/**
 * Tells `onEmailChange` the email a form holds, each time it changes: a sign-in over the page carries
 * it from one view to the next (ADR 0021). Only the email leaves the form; a password never does.
 */
export function useEmailReport(
  email: string,
  onEmailChange: ((email: string) => void) | undefined,
): void {
  const report = useRef(onEmailChange);

  useEffect(() => {
    report.current = onEmailChange;
  });

  useEffect(() => {
    report.current?.(email);
  }, [email]);
}
