import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';
import { useFieldControl } from '../Field';

export type TextareaProps = Omit<ComponentProps<'textarea'>, 'dir'> & {
  /** `ltr` for a value that reads left to right in either language (foundation §8). */
  dir?: 'ltr' | 'rtl' | 'auto';
};

/**
 * A multi-line text control that grows with its content. Inside a Field it takes the Field's label,
 * descriptions and error.
 */
export function Textarea({
  className,
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...props
}: TextareaProps) {
  const fieldProps = useFieldControl({
    id,
    'aria-describedby': describedBy,
    'aria-invalid': invalid,
  });

  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'field-sizing-content min-h-24 w-full rounded-(--radius-control) border border-input bg-background px-3 py-2 text-(length:--control-text-size) leading-(--type-body-line-height) text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:not-aria-invalid:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive',
        className,
      )}
      {...fieldProps}
      {...props}
    />
  );
}
