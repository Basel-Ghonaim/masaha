import type { ComponentProps, ReactNode } from 'react';
import { XIcon } from '../../../icons';
import { cn } from '../../../lib/cn';
import { Button } from '../../actions/Button';

export type FilterTagProps = Omit<ComponentProps<'span'>, 'children'> & {
  /** The filter in force, as the caller words it («المساحة: نور هب»). */
  children: ReactNode;
  /** The remove button's name («إزالة فلتر المساحة»): the layer has no words of its own. */
  removeLabel: string;
  onRemove: () => void;
};

/**
 * A filter in force, shown under a list's filters: its label and a button that removes it, as in
 * the Admin › Data reports stress test (finding 8). The pill is the chips' shape on the
 * `secondary` pair; the button is 32px, and the control height on touch, so it stays a 44px target.
 */
export function FilterTag({
  children,
  removeLabel,
  onRemove,
  className,
  ...props
}: FilterTagProps) {
  return (
    <span
      data-slot="filter-tag"
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-(--radius-pill) bg-secondary ps-3 text-body-sm text-secondary-foreground',
        className,
      )}
      {...props}
    >
      <span className="min-w-0 py-1 break-words">{children}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={removeLabel}
        onClick={onRemove}
        className="size-8 rounded-(--radius-pill) pointer-coarse:size-(--control-height)"
      >
        <XIcon aria-hidden />
      </Button>
    </span>
  );
}
