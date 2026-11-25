import type { Catalogue } from '@shared/copy';
import type { ForgotStep, SignInReason, SignInView } from './signInView';

/** The sign-in's title and the line under it, when it has one. */
export type InPlaceHeading = { title: string; description?: string };

/**
 * The heading of the sign-in over the page, for the action pressed, the view and, for the forgotten
 * password, the server's step: the reason titles the sign-in, and register keeps it; the forgotten
 * password is titled as its page's card is.
 */
export function inPlaceHeading(
  copy: Catalogue,
  reason: SignInReason,
  view: SignInView,
  step: ForgotStep,
): InPlaceHeading {
  const lines = copy.site.signInPrompt[reason];
  const forgot = copy.auth.forgotPassword;
  switch (view) {
    case 'register':
      return { title: lines.registerTitle, description: copy.auth.register.description };
    case 'forgot':
      if (step === 'sent') return { title: forgot.sentTitle };
      if (step === 'linkOpen') return { title: forgot.linkOpenTitle };
      if (step === 'request') return { title: forgot.title, description: forgot.description };
      return { title: forgot.title };
    default:
      return { title: lines.title, description: lines.text };
  }
}
