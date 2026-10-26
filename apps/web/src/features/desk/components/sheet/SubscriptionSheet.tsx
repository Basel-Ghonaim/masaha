import {
  Alert,
  AlertDescription,
  Button,
  Field,
  Input,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useSubscriptionSheet } from '../../hooks/sheet/useSubscriptionSheet';
import type { SheetChoices } from '../../types/SheetChoices';
import type { SheetEntry } from '../../types/SheetEntry';
import { MoneyBlock } from '../money/MoneyBlock';
import { CustomTerms } from './CustomTerms';
import { PackageOptions } from './PackageOptions';
import { PriorDebts } from './PriorDebts';

/**
 * «زبون جديد» / «اشتراك جديد» (screen 16), the end sheet, titled by its mode: a new customer's name,
 * focused first, and phone; what they owe from before; the choice of package or «مخصّص» with its
 * terms; the dates; the money block; one submit naming the amount. It is mounted for one opening (its
 * keys are that opening's); while it is sent nothing closes it; a failure shows above the footer,
 * every value kept, and a customer saved with the subscription refused says so (DI-37). Closed, the
 * focus returns to what opened it.
 */
export function SubscriptionSheet({
  spaceId,
  entry,
  choices,
  onClose,
}: {
  spaceId: number;
  entry: SheetEntry;
  choices: SheetChoices;
  onClose: () => void;
}) {
  const view = useSubscriptionSheet({ spaceId, entry, choices, onDone: onClose });
  const { customer, dates } = view;
  const busy = view.submit.busy;
  // The sheet focuses its first field as it opens: a new customer's name, else the chosen package.

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) view.close();
      }}
    >
      <SheetContent
        side="end"
        closeLabel={view.closeLabel}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <SheetHeader>
          <SheetTitle>{view.title}</SheetTitle>
          <SheetDescription dir="auto">{view.description}</SheetDescription>
        </SheetHeader>
        <form noValidate onSubmit={view.submit.run} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="flex flex-col gap-5 pb-4">
            {customer !== null && (
              <div className="flex flex-col gap-3">
                <Field label={customer.name.label} error={customer.name.error}>
                  <Input
                    dir="auto"
                    autoComplete="off"
                    aria-required
                    readOnly={customer.saved}
                    {...customer.name.field}
                  />
                </Field>
                <Field
                  label={customer.phone.label}
                  labelEnd={
                    customer.phone.optional !== null && (
                      <span className="text-caption text-muted-foreground">
                        {customer.phone.optional}
                      </span>
                    )
                  }
                  error={customer.phone.error}
                >
                  <Input
                    type="tel"
                    dir="ltr"
                    autoComplete="off"
                    aria-required={customer.phone.required}
                    readOnly={customer.saved}
                    {...customer.phone.field}
                  />
                </Field>
              </div>
            )}
            {view.prior !== null && <PriorDebts prior={view.prior} />}
            <PackageOptions view={view.packages} disabled={busy} />
            {view.custom !== null && <CustomTerms view={view.custom} disabled={busy} />}
            <div className="grid grid-cols-2 gap-3">
              <Field label={dates.from.label} error={dates.from.error}>
                <Input type="date" dir="ltr" {...dates.from.field} />
              </Field>
              {dates.to?.kind === 'package' && (
                <Field label={dates.to.label} helper={dates.to.help}>
                  <Input dir="auto" readOnly value={dates.to.text} />
                </Field>
              )}
              {dates.to?.kind === 'custom' && (
                <Field label={dates.to.label} helper={dates.to.help} error={dates.to.error}>
                  <Input type="date" dir="ltr" {...dates.to.field} />
                </Field>
              )}
            </div>
            <MoneyBlock view={view.money} label={view.moneyLabel} calc={[]} disabled={busy}>
              {view.noPhone !== null && (
                <p className="text-body-sm text-muted-foreground">{view.noPhone}</p>
              )}
            </MoneyBlock>
            {view.half !== null && (
              <Alert variant="warning">
                <AlertDescription>{view.half.title}</AlertDescription>
              </Alert>
            )}
            {view.failure !== null && <FormFailure view={view.failure} />}
          </SheetBody>
          <SheetFooter>
            <Button type="submit" className="w-full" loading={busy} disabled={view.submit.blocked}>
              {view.submit.label}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
