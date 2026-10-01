import { useId, type ComponentProps } from 'react';
import { CalendarIcon } from '../../../icons';
import { cn } from '../../../lib/cn';
import { useField, useFieldControl } from '../Field';
import { Popover, PopoverContent, PopoverTrigger } from '../../overlays/Popover';

/**
 * A date or a range chosen from a Calendar in a Popover: membership dates, report filters. Compose
 * it from DatePickerTrigger and DatePickerContent, with a Calendar inside the content. The caller
 * formats the chosen date for the trigger (docs/frontend/localisation.md, Formatting) and closes the
 * picker when a choice is complete, through `open` and `onOpenChange`.
 */
export function DatePicker(props: ComponentProps<typeof Popover>) {
  return <Popover {...props} />;
}

export type DatePickerTriggerProps = ComponentProps<'button'> & {
  /** Nothing is chosen yet, so the text is a placeholder and is shown muted. */
  empty?: boolean;
};

/**
 * The control that opens the calendar, with a calendar icon at its start, as in the Data reports
 * filter row. Its text is what the caller gives it: a formatted date, a range, or a period such as
 * «آخر 30 يوماً». Inside a Field it takes the Field's descriptions and error, and is named by the
 * label followed by that text.
 */
export function DatePickerTrigger({
  className,
  children,
  empty = false,
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...props
}: DatePickerTriggerProps) {
  const field = useField();
  const valueId = useId();
  const fieldProps = useFieldControl({
    id,
    'aria-describedby': describedBy,
    'aria-invalid': invalid,
  });

  return (
    <PopoverTrigger asChild>
      <button
        type="button"
        data-slot="date-picker-trigger"
        data-empty={empty || undefined}
        className={cn(
          "flex h-(--control-height) w-full items-center gap-2 rounded-(--radius-control) border border-input bg-background px-3 text-(length:--control-text-size) leading-(--type-body-line-height) whitespace-nowrap text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:not-aria-invalid:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-empty:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className,
        )}
        // A label's `for` would replace the button's text as its name, so the Field's label and the
        // chosen date name it together.
        aria-labelledby={field === null ? undefined : `${field.labelId} ${valueId}`}
        {...fieldProps}
        {...props}
      >
        <CalendarIcon aria-hidden className="text-muted-foreground" />
        <span id={valueId} className="truncate">
          {children}
        </span>
      </button>
    </PopoverTrigger>
  );
}

export type DatePickerContentProps = ComponentProps<typeof PopoverContent> & {
  /** Names the panel, such as "Choose the start date". */
  label: string;
};

/** The panel that holds the Calendar, at the trigger's start. */
export function DatePickerContent({
  label,
  className,
  align = 'start',
  ...props
}: DatePickerContentProps) {
  return (
    <PopoverContent
      data-slot="date-picker-content"
      aria-label={label}
      align={align}
      className={cn('w-auto p-0', className)}
      {...props}
    />
  );
}
