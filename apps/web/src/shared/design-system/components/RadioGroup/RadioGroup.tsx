import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';
import { FieldContext, useField, useFieldControl } from '../Field';

export type RadioGroupProps = ComponentProps<typeof RadioGroupPrimitive.Root>;

/**
 * A set of options with one chosen. Arrow keys move the choice, following the reading direction.
 * Inside a Field, the Field's label names the group and its helper and error describe it; each
 * option takes its own label from a horizontal Field around its RadioGroupItem.
 */
export function RadioGroup({
  className,
  id,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  children,
  ...props
}: RadioGroupProps) {
  const field = useField();
  const fieldProps = useFieldControl({
    id,
    'aria-describedby': describedBy,
    'aria-invalid': invalid,
  });

  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn('group/radio-group grid gap-1', className)}
      // A group is not a labelable element, so the Field's label names it by reference.
      aria-labelledby={labelledBy ?? field?.labelId}
      {...fieldProps}
      {...props}
    >
      {/* The group's Field ends here: an option takes only the Field around it, never the group's id. */}
      <FieldContext value={null}>{children}</FieldContext>
    </RadioGroupPrimitive.Root>
  );
}

export type RadioGroupItemProps = ComponentProps<typeof RadioGroupPrimitive.Item>;

export function RadioGroupItem({
  className,
  id,
  'aria-describedby': describedBy,
  ...props
}: RadioGroupItemProps) {
  const fieldProps = useFieldControl({ id, 'aria-describedby': describedBy });

  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        'relative flex aspect-square size-4.5 shrink-0 items-center justify-center rounded-full border border-input bg-transparent transition-colors after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:not-aria-invalid:not-group-aria-invalid/radio-group:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive group-aria-invalid/radio-group:border-destructive data-checked:border-primary data-checked:bg-primary',
        className,
      )}
      {...fieldProps}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="size-2.5 rounded-full bg-primary-foreground"
      />
    </RadioGroupPrimitive.Item>
  );
}
