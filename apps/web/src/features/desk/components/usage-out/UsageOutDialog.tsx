import type { CheckInCheckOut } from '@masaha/shared/desk';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useUsageOutDialog } from '../../hooks/usage-out/useUsageOutDialog';
import { MoneyBlock } from '../money/MoneyBlock';

/**
 * A usage-based subscriber's check-out, opened from its answer (D7.12): what today's stay came to
 * and what the subscription was paid, what it still owes, and the money block over it, «المستلم
 * الآن» focused first; «استلام {amount}» records it, `ghost` «لاحقًا» leaves it owed. Closed, the
 * focus goes where `returnFocus` places it.
 */
export function UsageOutDialog({
  spaceId,
  name,
  checkOut,
  onClose,
  returnFocus,
}: {
  spaceId: number;
  name: string;
  checkOut: CheckInCheckOut;
  onClose: () => void;
  returnFocus: () => void;
}) {
  const dialog = useUsageOutDialog({ spaceId, name, checkOut, onDone: onClose });

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !dialog.submit.busy) onClose();
      }}
    >
      <DialogContent
        onEscapeKeyDown={(event) => {
          if (dialog.submit.busy) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{dialog.title}</DialogTitle>
          <DialogDescription>{dialog.today}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={dialog.submit.run} className="flex flex-col gap-4">
          {dialog.left !== null && <p className="text-body-sm">{dialog.left}</p>}
          <MoneyBlock
            view={dialog.money}
            label={dialog.groupLabel}
            calc={[]}
            autoFocus
            disabled={dialog.submit.busy}
          />
          {dialog.failure !== null && <FormFailure view={dialog.failure} />}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={dialog.submit.busy} onClick={onClose}>
              {dialog.later}
            </Button>
            <Button type="submit" loading={dialog.submit.busy} disabled={dialog.submit.blocked}>
              {dialog.submit.label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
