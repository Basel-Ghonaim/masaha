import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../../lib/cn';
import { FieldContext, useField, useFieldControl } from '../Field';

export type SegmentedControlProps = ComponentProps<typeof RadioGroupPrimitive.Root>;

/**
 * One choice among a few short ones, drawn as joined segments on a track, such as the directory's
 * subscription «الكل · ساعة · يوم · أسبوع · شهر». It is a radiogroup: one tab stop, entering on the
 * chosen segment; the arrow keys choose the next or the previous, following the reading direction,
 * and loop; Home and End choose the first and the last. Inside a Field, the Field's label names it
 * and its helper describes it. No invalid state: it chooses among valid values.
 */
export function SegmentedControl({
  className,
  id,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  children,
  ...props
}: SegmentedControlProps) {
  const field = useField();
  const fieldProps = useFieldControl({ id, 'aria-describedby': describedBy });

  return (
    <RadioGroupPrimitive.Root
      data-slot="segmented-control"
      className={cn('flex w-full gap-1 rounded-(--radius-control) bg-muted p-1', className)}
      // A group is not a labelable element, so the Field's label names it by reference.
      aria-labelledby={labelledBy ?? field?.labelId}
      id={fieldProps.id}
      aria-describedby={fieldProps['aria-describedby']}
      loop
      {...props}
    >
      {/* The Field ends here: a segment is named by its own text, never by the group's label. */}
      <FieldContext value={null}>{children}</FieldContext>
    </RadioGroupPrimitive.Root>
  );
}

export type SegmentedControlItemProps = ComponentProps<typeof RadioGroupPrimitive.Item>;

/**
 * One segment, its label as its children. The chosen one is raised on the card's surface with the
 * card's edge, so it stands apart in dark, where cards have no shadow, and never by colour alone.
 */
export function SegmentedControlItem({
  className,
  onKeyDown,
  ...props
}: SegmentedControlItemProps) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="segmented-control-item"
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || (event.key !== 'Home' && event.key !== 'End')) return;
        // Radix's roving focus moves the focus on Home and End but chooses only on the arrow keys:
        // the segment chooses the end it moves to itself, as an arrow would.
        const segments = event.currentTarget
          .closest('[role="radiogroup"]')
          ?.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)');
        const target = event.key === 'Home' ? segments?.[0] : segments?.[segments.length - 1];
        if (target === undefined) return;
        event.preventDefault();
        target.focus();
        target.click();
      }}
      className={cn(
        'inline-flex h-8 min-w-0 flex-1 items-center justify-center truncate rounded-(--radius-control) border border-transparent px-2 text-label whitespace-nowrap text-muted-foreground transition-colors select-none hover:text-foreground data-unchecked:hover:bg-hover-on-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:h-(--control-height) data-checked:border-(--card-border) data-checked:bg-card data-checked:text-card-foreground data-checked:shadow-raised',
        className,
      )}
      {...props}
    />
  );
}
