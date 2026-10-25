import { Button, Field, Input, ToggleGroup, ToggleGroupItem } from '@shared/design-system';
import { PAYMENT_METHODS } from '@masaha/shared/payments';
import { useId, type ReactNode } from 'react';
import type { MoneyBlockView, PaymentMethod } from '../../types/MoneyBlockView';

const isMethod = (value: string): value is PaymentMethod =>
  PAYMENT_METHODS.some((method) => method === value);

/**
 * The money block (K2), one group named «الدفع»: how the due was billed, the due in its own weight
 * (DI-25), «المستلم الآن», described as filled with the due (DI-15), the method while something is
 * received, the one line of what follows, said politely as it changes (DI-26), what the page adds
 * under it (`children`: the debt's fields), and the toggle of paying nothing (DI-12).
 */
export function MoneyBlock({
  view,
  label,
  calc,
  autoFocus = false,
  disabled = false,
  children,
}: {
  view: MoneyBlockView;
  label: string;
  calc: string[];
  autoFocus?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const labelId = useId();
  const prefilledId = useId();

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="flex flex-col gap-3 rounded-lg bg-muted p-3"
    >
      <span id={labelId} className="sr-only">
        {label}
      </span>
      {calc.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-body-sm text-muted-foreground">
          {calc.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <p className="flex items-baseline justify-between gap-3">
        <span className="text-label">{view.due.label}</span>
        <span dir="ltr" className="text-heading-2">
          {view.due.amount}
        </span>
      </p>
      <Field label={view.received.label} error={view.received.error}>
        <Input
          dir="ltr"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          value={view.received.text}
          onChange={(event) => {
            view.received.change(event.target.value);
          }}
          disabled={disabled}
          aria-describedby={prefilledId}
        />
      </Field>
      <span id={prefilledId} className="sr-only">
        {view.received.description}
      </span>
      {view.method !== null && (
        <Field label={view.method.label}>
          <ToggleGroup
            type="single"
            value={view.method.value}
            onValueChange={(value) => {
              if (isMethod(value)) view.method?.choose(value);
            }}
            disabled={disabled}
          >
            {view.method.options.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      )}
      <p aria-live="polite" className="text-body-sm">
        {view.line}
      </p>
      {children}
      {view.toggle !== null && (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={disabled}
          onClick={view.toggle.run}
        >
          {view.toggle.label}
        </Button>
      )}
    </div>
  );
}
