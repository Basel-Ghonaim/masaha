import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Textarea,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useCollectDialog } from '../../hooks/collect/useCollectDialog';
import type { UncollectedItem } from '../../types/UncollectedItem';
import { MoneyBlock } from '../money/MoneyBlock';

/**
 * «تحصيل» of an uncollected visit: the money block with «المستلم الآن» focused first, filled with what
 * the visit still owes; a note; the name and the phone a remainder is left to, the name first; and one
 * submit naming what it records. While it is sent nothing closes it; a failure shows above the
 * footer, every value kept. Closed, `returnFocus` places the focus.
 */
export function CollectDialog({
  spaceId,
  item,
  onClose,
  returnFocus,
}: {
  spaceId: number;
  item: UncollectedItem;
  onClose: () => void;
  returnFocus: () => void;
}) {
  const dialog = useCollectDialog({ spaceId, item, onDone: onClose });
  const { debt } = dialog;

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
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{dialog.title}</DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={dialog.submit.run} className="flex flex-col gap-4">
          <MoneyBlock
            view={dialog.money}
            label={dialog.groupLabel}
            calc={[]}
            autoFocus
            disabled={dialog.submit.busy}
          >
            {debt?.kind === 'customer' && (
              <p className="text-body-sm text-muted-foreground">{debt.line}</p>
            )}
            {debt?.kind === 'fields' && (
              <div className="flex flex-col gap-3">
                <Field label={debt.name.label} error={debt.nameError}>
                  <Input dir="auto" autoComplete="off" {...debt.name.field} />
                </Field>
                <Field label={debt.phone.label} error={debt.phoneError}>
                  <Input
                    type="tel"
                    dir="ltr"
                    autoComplete="off"
                    aria-required={debt.required}
                    {...debt.phone.field}
                  />
                </Field>
              </div>
            )}
          </MoneyBlock>
          <Field label={dialog.note.label} error={dialog.note.error}>
            <Textarea {...dialog.note.field} />
          </Field>
          {dialog.failure !== null && <FormFailure view={dialog.failure} />}
          <DialogFooter>
            <Button type="submit" loading={dialog.submit.busy} disabled={dialog.submit.blocked}>
              {dialog.submit.label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
