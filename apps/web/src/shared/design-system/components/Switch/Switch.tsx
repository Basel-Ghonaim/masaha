import { Switch as SwitchPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';
import { useFieldControl } from '../Field';

export type SwitchProps = ComponentProps<typeof SwitchPrimitive.Root>;

/**
 * An on/off setting that applies at once. The thumb starts at the start side and slides toward the
 * end, so it moves right in LTR and left in RTL. In a horizontal Field its label follows it.
 */
export function Switch({
  className,
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...props
}: SwitchProps) {
  const fieldProps = useFieldControl({
    id,
    'aria-describedby': describedBy,
    'aria-invalid': invalid,
  });

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors after:absolute after:-inset-x-3 after:-inset-y-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-checked:bg-primary data-unchecked:bg-input',
        className,
      )}
      {...fieldProps}
      {...props}
    >
      {/* translate-x has no logical form, so the thumb's travel is reversed in RTL. */}
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full bg-background transition-transform data-checked:translate-x-4 data-checked:bg-primary-foreground rtl:data-checked:-translate-x-4"
      />
    </SwitchPrimitive.Root>
  );
}
