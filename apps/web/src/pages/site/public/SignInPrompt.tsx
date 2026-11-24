import { useCopy } from '@shared/copy';
import {
  AdaptiveDialog,
  AdaptiveDialogContent,
  AdaptiveDialogDescription,
  AdaptiveDialogFooter,
  AdaptiveDialogHeader,
  AdaptiveDialogTitle,
  Button,
} from '@shared/design-system';
import { Link, useLocation } from 'react-router';
import { SITE_PATHS } from '../navigation';

/** What a guest pressed that needs an account. */
export type SignInReason = 'favorite' | 'report';

/**
 * A guest's sign-in, asked for an action that needs an account (C4, DI-60): titled and worded by
 * `reason`, with «إنشاء حساب» and «تسجيل الدخول», each carrying this page as the one to return to,
 * where the held action then runs. The layer's adaptive dialog: the whole screen on a phone, Back
 * closing it; its links replace its history entry, so Back from the sign-in returns to this page.
 * Closed with neither, by any way, `onClose`.
 */
export function SignInPrompt({
  reason,
  onClose,
}: {
  /** The action the guest pressed; none, and the prompt is closed. */
  reason: SignInReason | null;
  onClose: () => void;
}) {
  const words = useCopy().site.signInPrompt;
  const { pathname, search } = useLocation();
  const next = `?${new URLSearchParams({ next: `${pathname}${search}` }).toString()}`;
  const lines = reason === null ? null : words[reason];

  return (
    <AdaptiveDialog
      open={lines !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {lines !== null && (
        <AdaptiveDialogContent closeLabel={words.close}>
          <AdaptiveDialogHeader>
            <AdaptiveDialogTitle>{lines.title}</AdaptiveDialogTitle>
            <AdaptiveDialogDescription>{lines.text}</AdaptiveDialogDescription>
          </AdaptiveDialogHeader>
          <AdaptiveDialogFooter>
            <Button asChild variant="outline">
              <Link replace to={`${SITE_PATHS.register}${next}`}>
                {words.register}
              </Link>
            </Button>
            <Button asChild>
              <Link replace to={`${SITE_PATHS.signIn}${next}`}>
                {words.signIn}
              </Link>
            </Button>
          </AdaptiveDialogFooter>
        </AdaptiveDialogContent>
      )}
    </AdaptiveDialog>
  );
}
