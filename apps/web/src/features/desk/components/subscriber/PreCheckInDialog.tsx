import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { SubscriberCheckInView } from '../../hooks/subscriber/useSubscriberCheckIn';

/**
 * The choice before a check-in the row already questions (DI-14): why it asks — no subscription, or
 * its end, or its start — then «تسجيل كزيارة» with what it means, focused first, «تسجيل على أي حال»
 * on the subscription when there is one, and «رجوع». A coming subscription's start that could not be
 * read says so, with its retry. While a choice is sent nothing closes it; a
 * failure shows above the footer. Closed, `focusAfter` says where the focus goes.
 */
export function PreCheckInDialog({
  dialog,
  focusAfter,
}: {
  dialog: SubscriberCheckInView['dialog'];
  focusAfter: () => HTMLElement | null;
}) {
  return (
    <Dialog
      open={dialog.open}
      onOpenChange={(open) => {
        if (!open) dialog.back.run();
      }}
    >
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (dialog.busy) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          const target = focusAfter();
          if (target !== null) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle dir="auto">{dialog.title}</DialogTitle>
          {dialog.reason !== null ? (
            <DialogDescription>{dialog.reason}</DialogDescription>
          ) : (
            dialog.reasonFailure === null && <Skeleton className="h-5 w-3/4" />
          )}
        </DialogHeader>
        {dialog.reasonFailure !== null && (
          <Alert variant="destructive">
            <AlertTitle>{dialog.reasonFailure.title}</AlertTitle>
            <AlertDescription>{dialog.reasonFailure.message}</AlertDescription>
            <AlertAction>
              <Button variant="outline" onClick={dialog.reasonFailure.retry}>
                {dialog.reasonFailure.retryLabel}
              </Button>
            </AlertAction>
          </Alert>
        )}
        <p className="text-body-sm text-muted-foreground">{dialog.asVisit.note}</p>
        {dialog.failure !== null && <FormFailure view={dialog.failure} />}
        <DialogFooter>
          <Button variant="ghost" disabled={dialog.busy} onClick={dialog.back.run}>
            {dialog.back.label}
          </Button>
          {dialog.anyway !== null && (
            <Button variant="outline" disabled={dialog.busy} onClick={dialog.anyway.run}>
              {dialog.anyway.label}
            </Button>
          )}
          <Button autoFocus loading={dialog.busy} onClick={dialog.asVisit.run}>
            {dialog.asVisit.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
