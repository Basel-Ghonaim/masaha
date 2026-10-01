import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../../lib/cn';
import { useFieldControl } from '../Field';

export type InputProps = Omit<ComponentProps<'input'>, 'dir'> & {
  /**
   * `ltr` for a value that reads left to right in either language: an email, a phone number, a URL
   * (docs/frontend/design-system/foundation.md §8).
   */
  dir?: 'ltr' | 'rtl' | 'auto';
  /** A decorative icon at the start of the box, such as a search glass. Hidden from assistive technology. */
  startIcon?: ReactNode;
  /**
   * A decorative icon at the end of the box, such as an error mark. Hidden from assistive
   * technology: the Field's text carries what it means.
   */
  endIcon?: ReactNode;
  /** A button at the very end of the box (clear, show the password): an InputAction. */
  action?: ReactNode;
};

const SLOT_ICON = "flex shrink-0 text-muted-foreground [&_svg:not([class*='size-'])]:size-4";

/**
 * A single-line text control. Inside a Field it takes the Field's label, descriptions and error.
 * The box around the text can hold icons and a button; `className` styles that box, and every other
 * prop goes to the input itself.
 */
export function Input({
  className,
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  startIcon,
  endIcon,
  action,
  ...props
}: InputProps) {
  const fieldProps = useFieldControl({
    id,
    'aria-describedby': describedBy,
    'aria-invalid': invalid,
  });

  // The box shows the input's focus, error and disabled states, so a button inside it keeps its own
  // focus outline. An invalid input keeps its error border while focused.
  return (
    <div
      data-slot="input-group"
      className={cn(
        'flex h-(--control-height) w-full min-w-0 items-center gap-2 rounded-(--radius-control) border border-input bg-background px-3 text-foreground transition-colors has-[[data-slot=input-action]]:pe-1 has-[[data-slot=input]:focus-visible]:outline-2 has-[[data-slot=input]:focus-visible]:outline-offset-2 has-[[data-slot=input]:focus-visible]:outline-ring has-[[data-slot=input]:focus-visible:not([aria-invalid=true])]:border-ring has-[[data-slot=input][aria-invalid=true]]:border-destructive has-[[data-slot=input]:disabled]:cursor-not-allowed has-[[data-slot=input]:disabled]:opacity-50',
        className,
      )}
    >
      {startIcon !== undefined && (
        <span aria-hidden className={SLOT_ICON}>
          {startIcon}
        </span>
      )}
      <input
        data-slot="input"
        className="h-full min-w-0 flex-1 bg-transparent text-(length:--control-text-size) leading-(--type-body-line-height) outline-none placeholder:text-muted-foreground file:inline-flex file:border-0 file:bg-transparent file:text-label file:text-foreground disabled:cursor-not-allowed"
        {...fieldProps}
        {...props}
      />
      {endIcon !== undefined && (
        <span aria-hidden className={SLOT_ICON}>
          {endIcon}
        </span>
      )}
      {action}
    </div>
  );
}

export type InputActionProps = Omit<
  ComponentProps<'button'>,
  'children' | 'type' | 'aria-label'
> & {
  /** The button's accessible name, from the catalogue: "Clear the search", "Show the password". */
  label: string;
  /** The icon it shows. Hidden from assistive technology, since `label` names the button. */
  icon: ReactNode;
};

/**
 * A button inside an Input's box. Its hit area reaches past the drawn button, so it is a 44px
 * target on touch screens.
 */
export function InputAction({ label, icon, className, ...props }: InputActionProps) {
  return (
    <button
      type="button"
      data-slot="input-action"
      aria-label={label}
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors after:absolute after:-inset-1.5 hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span aria-hidden className="flex">
        {icon}
      </span>
    </button>
  );
}
