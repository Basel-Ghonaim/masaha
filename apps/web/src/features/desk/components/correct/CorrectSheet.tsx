import type { SubscriptionState } from '@masaha/shared/subscriptions';
import {
  Alert,
  AlertDescription,
  Button,
  Field,
  Input,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Textarea,
  ToggleGroup,
  ToggleGroupItem,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useCorrectSheet } from '../../hooks/correct/useCorrectSheet';
import { DateField } from '../sheet/DateField';

/**
 * «تصحيح {name}» (D8.4, DI11–DI13): an end sheet, full width on a phone, opened from a subscription
 * card's «⋯»: «الاسم والتواريخ والحدود», then the owner's «السعر»; its footer «حفظ التصحيح» and
 * «رجوع». Its first field, the name, takes the focus as it opens (the sheet's own first focus: no
 * field asks for it); while it is sent nothing closes it; a refusal shows above
 * the footer, every value kept. Closed, the focus goes to `returnFocus`'s element.
 */
export function CorrectSheet({
  spaceId,
  subscription,
  owner,
  onClose,
  returnFocus,
}: {
  spaceId: number;
  subscription: SubscriptionState;
  /** The owner's sheet offers the price; the server decides (S5). */
  owner: boolean;
  onClose: () => void;
  returnFocus: () => HTMLElement | null;
}) {
  const view = useCorrectSheet({ spaceId, subscription, owner, onDone: onClose });
  const { terms, price } = view;
  const busy = view.submit.busy;

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <SheetContent
        side="end"
        closeLabel={view.closeLabel}
        aria-describedby={undefined}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          const target = returnFocus();
          if (target?.isConnected === true) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
        <SheetHeader>
          <SheetTitle dir="auto">{view.title}</SheetTitle>
        </SheetHeader>
        <form noValidate onSubmit={view.submit.run} className="flex min-h-0 flex-1 flex-col">
          <SheetBody className="flex flex-col gap-5 pb-4">
            <fieldset className="flex min-w-0 flex-col gap-4">
              <legend className="mb-1 text-label">{terms.title}</legend>
              <Field label={terms.name.label} error={terms.name.error}>
                <Input dir="auto" autoComplete="off" aria-required {...terms.name.field} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={terms.from.label} error={terms.from.error}>
                  <DateField date={terms.from} disabled={busy} />
                </Field>
                <Field label={terms.to.label} error={terms.to.error}>
                  <DateField date={terms.to} disabled={busy} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {terms.limits.map((limit) => (
                  <Field key={limit.key} label={limit.label} error={limit.error}>
                    <Input
                      dir="ltr"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder={limit.placeholder}
                      {...limit.field}
                    />
                  </Field>
                ))}
              </div>
            </fieldset>
            {price !== null && (
              <fieldset className="flex min-w-0 flex-col gap-4 rounded-lg border border-border p-3">
                <legend className="px-1 text-label">{price.title}</legend>
                <Field label={price.billing.label}>
                  <ToggleGroup
                    type="single"
                    value={price.billing.value}
                    onValueChange={price.billing.choose}
                    disabled={busy}
                  >
                    {price.billing.options.map((option) => (
                      <ToggleGroupItem key={option.value} value={option.value}>
                        {option.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>
                <Field label={price.price.label} error={price.price.error}>
                  <Input
                    dir="ltr"
                    inputMode="decimal"
                    autoComplete="off"
                    aria-required
                    {...price.price.field}
                  />
                </Field>
                <Field label={price.reason.label} error={price.reason.error}>
                  <Textarea aria-required {...price.reason.field} />
                </Field>
              </fieldset>
            )}
            {view.unchanged !== null && (
              <Alert variant="info">
                <AlertDescription>{view.unchanged}</AlertDescription>
              </Alert>
            )}
            {view.failure !== null && <FormFailure view={view.failure} />}
          </SheetBody>
          <SheetFooter className="flex-row gap-2">
            <Button type="submit" className="flex-1" loading={busy} disabled={view.submit.blocked}>
              {view.submit.label}
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              {view.back.label}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
