import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { CheckIcon } from '../../icons';
import { cn } from '../../lib/cn';
import { useField, useFieldControl } from '../Field';

export type ToggleGroupProps = ComponentProps<typeof ToggleGroupPrimitive.Root>;

/**
 * A set of filter chips, as in the Admin › Data reports filter sheet. With `type="multiple"` any
 * number are on at once; with `type="single"`, at most one. Arrow keys move between chips,
 * following the reading direction. Inside a Field, the Field's label names the group and its helper
 * describes it.
 */
export function ToggleGroup({
  className,
  id,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  ...props
}: ToggleGroupProps) {
  const field = useField();
  const fieldProps = useFieldControl({ id, 'aria-describedby': describedBy });

  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn('flex flex-wrap items-center gap-2', className)}
      // A group is not a labelable element, so the Field's label names it by reference.
      aria-labelledby={labelledBy ?? field?.labelId}
      id={fieldProps.id}
      aria-describedby={fieldProps['aria-describedby']}
      // No invalid state: chips filter a list, and a filter cannot be wrong.
      {...props}
    />
  );
}

export type ToggleGroupItemProps = ComponentProps<typeof ToggleGroupPrimitive.Item>;

/**
 * One chip. When on, it takes the accent pair, a primary edge and a check at its start, so the
 * state never rests on colour alone. The edges are sampled from the stress test: `input` off,
 * `primary` on.
 */
export function ToggleGroupItem({ className, children, ...props }: ToggleGroupItemProps) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        "group/chip inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-(--radius-pill) border border-input bg-card px-3 text-label whitespace-nowrap text-foreground transition-colors select-none hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 pointer-coarse:h-(--control-height) data-on:border-primary data-on:bg-accent data-on:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <CheckIcon aria-hidden className="hidden group-data-on/chip:block" />
      {children}
    </ToggleGroupPrimitive.Item>
  );
}
