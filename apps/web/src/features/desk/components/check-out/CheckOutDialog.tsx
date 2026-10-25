import type { PresentPerson } from '@masaha/shared/occupancy';
import type { VisitTerms } from '@masaha/shared/visits';
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Skeleton,
  Textarea,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import type { RefObject } from 'react';
import { useCheckOutDialog } from '../../hooks/check-out/useCheckOutDialog';
import { MoneyBlock } from '../money/MoneyBlock';

/**
 * A visit's check-out: the visitor and their stay, how it was billed, the money block with «المستلم
 * الآن» focused first (or the typed price, for a visit with no rate), the name and phone a remainder
 * is left to, and one submit naming what it records. While it is sent nothing closes it; a failure
 * shows above the footer, every value kept. Closed, the focus goes to `returnFocus` when given.
 */
export function CheckOutDialog({
  spaceId,
  person,
  terms,
  onClose,
  returnFocus,
}: {
  spaceId: number;
  person: Extract<PresentPerson, { kind: 'VISIT' }>;
  terms: VisitTerms;
  onClose: () => void;
  returnFocus?: RefObject<HTMLElement | null>;
}) {
  const dialog = useCheckOutDialog({ spaceId, person, terms, onDone: onClose });
  const { typed, debt, money } = dialog;

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
          if (returnFocus?.current) {
            event.preventDefault();
            returnFocus.current.focus();
          }
        }}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{dialog.title}</DialogTitle>
          <Badge variant="neutral" className="self-start">
            {dialog.kind}
          </Badge>
        </DialogHeader>
        {dialog.state === 'loading' ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : dialog.state === 'failed' ? (
          <Alert variant="destructive">
            <AlertDescription>{dialog.quoteFailed}</AlertDescription>
          </Alert>
        ) : (
          <form noValidate onSubmit={dialog.submit.run} className="flex flex-col gap-4">
            <dl className="grid grid-cols-3 gap-2 text-body-sm">
              {dialog.rows.map((row) => (
                <div key={row.label} className="flex flex-col">
                  <dt className="text-caption text-muted-foreground">{row.label}</dt>
                  <dd>
                    {/* A time reads left to right; a length of time in its words. */}
                    <span dir="auto">{row.value}</span>
                  </dd>
                </div>
              ))}
            </dl>
            {typed !== null && (
              <div className="flex flex-col gap-3">
                <Badge variant="info" className="self-start">
                  {typed.badge}
                </Badge>
                <Field label={typed.amount.label} helper={typed.help} error={typed.amount.error}>
                  <Input
                    dir="ltr"
                    inputMode="decimal"
                    autoComplete="off"
                    autoFocus
                    {...typed.amount.field}
                  />
                </Field>
                <Field label={typed.reason.label} error={typed.reason.error}>
                  <Textarea {...typed.reason.field} />
                </Field>
              </div>
            )}
            {dialog.unpriced !== null && <p className="text-body-sm">{dialog.unpriced}</p>}
            {money !== null ? (
              <MoneyBlock
                view={money}
                label={dialog.groupLabel}
                calc={dialog.calc}
                autoFocus={typed === null}
                disabled={dialog.submit.busy}
              >
                <DebtFields debt={debt} />
              </MoneyBlock>
            ) : (
              <DebtFields debt={debt} autoFocus />
            )}
            {dialog.quoteChanged !== null && (
              <Alert variant="warning">
                <AlertDescription>{dialog.quoteChanged}</AlertDescription>
              </Alert>
            )}
            {dialog.failure !== null && <FormFailure view={dialog.failure} />}
            <DialogFooter>
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

/** Who a remainder is left to: the visit's customer, or a name and a phone, the name first (DI-17). */
function DebtFields({
  debt,
  autoFocus = false,
}: {
  debt: ReturnType<typeof useCheckOutDialog>['debt'];
  autoFocus?: boolean;
}) {
  if (debt === null) return null;
  if (debt.kind === 'customer') {
    return <p className="text-body-sm text-muted-foreground">{debt.line}</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      <Field label={debt.name.label} error={debt.nameError}>
        <Input dir="auto" autoComplete="off" {...debt.name.field} />
      </Field>
      <Field label={debt.phone.label} error={debt.phoneError}>
        <Input
          type="tel"
          dir="ltr"
          autoComplete="off"
          autoFocus={autoFocus}
          aria-required={debt.required}
          {...debt.phone.field}
        />
      </Field>
    </div>
  );
}
