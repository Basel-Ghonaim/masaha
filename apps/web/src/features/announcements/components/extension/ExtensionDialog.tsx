import type { ManagedAnnouncement } from '@masaha/shared/announcements';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertTitle,
  Button,
  Field,
  Input,
  Skeleton,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useExtensionDialog } from '../../hooks/extension/useExtensionDialog';

/**
 * «تمديد الاشتراكات» (O11): an alert dialog titled by what it asks, saying how many subscriptions the
 * extension moves and its true consequence, then the days, prefilled with the proposal (DI-20), with
 * the closure's days under them; «رجوع» and the destructive submit, counting the subscriptions. A
 * skeleton while the preview loads, its failure with a retry; a closure that covered none, or one
 * extended meanwhile, says so with «رجوع» only (S11). While it is sent nothing closes it; a failure
 * shows above the footer, the days kept (DI-19). The days are focused first once they show. Closed,
 * `returnFocus` places the focus.
 */
export function ExtensionDialog({
  spaceId,
  closure,
  onClose,
  returnFocus,
}: {
  spaceId: number;
  closure: ManagedAnnouncement;
  onClose: () => void;
  returnFocus: () => void;
}) {
  const dialog = useExtensionDialog({ spaceId, closure, onDone: onClose });
  const busy = dialog.submit.busy;

  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <AlertDialogContent
        // An alert dialog focuses «رجوع» first; the days are what the owner checks first.
        onOpenAutoFocus={(event) => {
          const days = event.target instanceof HTMLElement && event.target.querySelector('input');
          if (days instanceof HTMLInputElement) {
            event.preventDefault();
            days.focus();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-1">
              {dialog.state === 'loading' && <Skeleton className="h-5 w-48" />}
              {dialog.state === 'ready' && (
                <>
                  <span>{dialog.covered}</span>
                  <span>{dialog.text}</span>
                </>
              )}
              {dialog.state === 'none' && <span>{dialog.none}</span>}
              {dialog.state === 'applied' && <span>{dialog.applied}</span>}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {dialog.loadFailure !== null && (
          <Alert variant="destructive">
            <AlertTitle>{dialog.loadFailure.title}</AlertTitle>
            <AlertDescription>{dialog.loadFailure.message}</AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                disabled={dialog.loadFailure.blocked}
                onClick={dialog.loadFailure.retry}
              >
                {dialog.loadFailure.retryLabel}
              </Button>
            </AlertAction>
          </Alert>
        )}
        {dialog.state === 'ready' ? (
          <form noValidate onSubmit={dialog.submit.run} className="flex flex-col gap-4">
            <Field
              label={dialog.days.label}
              helper={dialog.days.helper ?? undefined}
              error={dialog.days.error}
            >
              <Input
                inputMode="numeric"
                dir="ltr"
                autoComplete="off"
                autoFocus
                aria-required
                className="w-20"
                {...dialog.days.field}
              />
            </Field>
            {dialog.failure !== null && <FormFailure view={dialog.failure} />}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>{dialog.back}</AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                loading={busy}
                disabled={dialog.submit.blocked}
              >
                {dialog.submit.label}
              </Button>
            </AlertDialogFooter>
          </form>
        ) : (
          <AlertDialogFooter>
            <AlertDialogCancel>{dialog.back}</AlertDialogCancel>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
