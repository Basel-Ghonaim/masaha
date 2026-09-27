import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { CheckIcon } from '../../icons';
import { cn } from '../../lib/cn';
import { useFieldControl } from '../Field';

export type CheckboxProps = ComponentProps<typeof CheckboxPrimitive.Root>;

/**
 * A checkbox. In a horizontal Field its label follows it and toggles it, and the row is the touch
 * target; on its own, its hit area reaches past the box.
 */
export function Checkbox({
  className,
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...props
}: CheckboxProps) {
  const fieldProps = useFieldControl({
    id,
    'aria-describedby': describedBy,
    'aria-invalid': invalid,
  });

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer relative flex size-4.5 shrink-0 items-center justify-center rounded-sm border border-input bg-transparent text-primary-foreground transition-colors after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:not-aria-invalid:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-checked:border-primary data-checked:bg-primary',
        className,
      )}
      {...fieldProps}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current"
      >
        <CheckIcon aria-hidden className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
