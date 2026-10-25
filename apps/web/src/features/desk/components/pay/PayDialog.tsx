import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  RadioGroup,
  RadioGroupItem,
  SearchIcon,
  Skeleton,
  Textarea,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useId } from 'react';
import { usePayDialog, type PayTarget } from '../../hooks/pay/usePayDialog';
import { BalanceBadge } from '../card/BalanceBadge';
import { MoneyBlock } from '../money/MoneyBlock';

/**
 * «استلام دفعة»: with no customer, the debtors to choose from, those present first; then the
 * customer's open items, one chosen, the money block with «المستلم الآن» filled with what it still
 * owes, a note, and one submit naming what it records. While it is sent nothing closes it; a failure
 * shows above the footer, every value kept. Closed, `returnFocus` places the focus when given.
 */
export function PayDialog({
  spaceId,
  target,
  presentIds,
  onClose,
  returnFocus,
}: {
  spaceId: number;
  target: PayTarget;
  presentIds: ReadonlySet<number>;
  onClose: () => void;
  returnFocus?: () => HTMLElement | null;
}) {
  const dialog = usePayDialog({ spaceId, target, presentIds, onDone: onClose });
  const { pick } = dialog;
  const owingId = useId();

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
          const target = returnFocus?.() ?? null;
          if (target !== null) {
            event.preventDefault();
            target.focus();
          }
        }}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle dir="auto">{dialog.title}</DialogTitle>
        </DialogHeader>
        {dialog.step === 'pick' && (
          <div className="flex flex-col gap-3">
            <Input
              type="search"
              aria-label={pick.input.label}
              placeholder={pick.input.placeholder}
              value={pick.input.text}
              onChange={(event) => {
                pick.input.change(event.target.value);
              }}
              autoFocus
              startIcon={<SearchIcon />}
            />
            <p id={owingId} className="text-label">
              {pick.heading}
            </p>
            {pick.state === 'loading' && <Skeleton className="h-24" />}
            {pick.state === 'failed' && (
              <Alert variant="destructive">
                <AlertTitle>{pick.failure.title}</AlertTitle>
                <AlertDescription>{pick.failure.message}</AlertDescription>
                <AlertAction>
                  <Button variant="outline" onClick={pick.failure.retry}>
                    {pick.failure.retryLabel}
                  </Button>
                </AlertAction>
              </Alert>
            )}
            {pick.none !== null && (
              <p className="text-body-sm text-muted-foreground">{pick.none}</p>
            )}
            {pick.rows.length > 0 && (
              <ul aria-labelledby={owingId} className="flex flex-col divide-y">
                {pick.rows.map((row) => (
                  <li key={row.key} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="self-start text-label" dir="auto">
                        {row.name}
                      </span>
                      {row.phone !== null && (
                        <span className="text-caption text-muted-foreground" dir="ltr">
                          {row.phone}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <BalanceBadge balance={row.balance} />
                      <Button variant="outline" onClick={row.choose}>
                        {pick.pickLabel}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {dialog.step === 'loading' && <Skeleton className="h-40" />}
        {dialog.step === 'failed' && (
          <Alert variant="destructive">
            <AlertTitle>{dialog.fileFailure.title}</AlertTitle>
            <AlertDescription>{dialog.fileFailure.message}</AlertDescription>
            <AlertAction>
              <Button variant="outline" onClick={dialog.fileFailure.retry}>
                {dialog.fileFailure.retryLabel}
              </Button>
            </AlertAction>
          </Alert>
        )}
        {dialog.step === 'nothing' && (
          <p className="text-body-sm text-muted-foreground">{dialog.nothing}</p>
        )}
        {dialog.step === 'items' && (
          <form noValidate onSubmit={dialog.submit.run} className="flex flex-col gap-4">
            <Field label={dialog.items.legend}>
              <RadioGroup
                value={dialog.items.chosen}
                onValueChange={dialog.items.choose}
                disabled={dialog.submit.busy}
                className="flex flex-col gap-3"
              >
                {dialog.items.options.map((option) => (
                  <Field
                    key={option.key}
                    orientation="horizontal"
                    label={
                      <span className="flex flex-col gap-0.5">
                        <span dir="auto">{option.label}</span>
                        <span className="text-caption text-muted-foreground">{option.line}</span>
                      </span>
                    }
                  >
                    <RadioGroupItem value={option.key} />
                  </Field>
                ))}
              </RadioGroup>
            </Field>
            <MoneyBlock
              view={dialog.money}
              label={dialog.groupLabel}
              calc={[]}
              autoFocus
              disabled={dialog.submit.busy}
            >
              {dialog.usageNote !== null && (
                <p className="text-body-sm text-muted-foreground">{dialog.usageNote}</p>
              )}
            </MoneyBlock>
            <Field label={dialog.note.label} error={dialog.note.error}>
              <Textarea {...dialog.note.field} />
            </Field>
            {dialog.failure !== null && <FormFailure view={dialog.failure} />}
            <DialogFooter>
              {dialog.another !== null && (
                <Button variant="ghost" type="button" onClick={dialog.another.run}>
                  {dialog.another.label}
                </Button>
              )}
              <Button type="submit" loading={dialog.submit.busy} disabled={dialog.submit.blocked}>
                {dialog.submit.label}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
