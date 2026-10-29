import { useCopy } from '@shared/copy';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/design-system';
import { Link, useLocation } from 'react-router';
import { SITE_PATHS } from '../navigation';

/** What a guest pressed that needs an account. */
export type SignInReason = 'favorite' | 'report';

/**
 * A guest's sign-in, asked for an action that needs an account (C4, DI-60): titled and worded by
 * `reason`, with «إنشاء حساب» and «تسجيل الدخول», each carrying this page as the one to return to,
 * where the held action then runs. Closed with neither, `onClose`.
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
    <Dialog
      open={lines !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {lines !== null && (
        <DialogContent closeLabel={words.close}>
          <DialogHeader>
            <DialogTitle>{lines.title}</DialogTitle>
            <DialogDescription>{lines.text}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button asChild variant="outline">
              <Link to={`${SITE_PATHS.register}${next}`}>{words.register}</Link>
            </Button>
            <Button asChild>
              <Link to={`${SITE_PATHS.signIn}${next}`}>{words.signIn}</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
