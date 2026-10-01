import { cva } from 'class-variance-authority';
import { Dialog as SheetPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { XIcon } from '../../../icons';
import { cn } from '../../../lib/cn';
import { Button } from '../../actions/Button';
import { overlayClasses } from '../Dialog';

/**
 * A panel that slides over the page: from the start side for navigation (where the dashboard
 * sidebar sits), from the end for secondary panels, and from the bottom for the phone filter panel.
 * It is a modal dialog: it traps the focus while open and returns it to its trigger.
 */
export function Sheet(props: ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

export function SheetTrigger(props: ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

export function SheetClose(props: ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

// The sides are logical: start and end follow the reading direction, and so does the slide, which
// tw-animate-css resolves with :dir().
const sheetVariants = cva(
  'fixed z-(--z-modal) flex flex-col bg-popover text-body text-popover-foreground shadow-overlay duration-(--duration-medium) ease-(--easing-standard) outline-none data-open:animate-in data-closed:animate-out',
  {
    variants: {
      side: {
        start:
          'inset-y-0 start-0 h-full w-3/4 max-w-sm border-e border-(--card-border) data-open:slide-in-from-start data-closed:slide-out-to-start',
        end: 'inset-y-0 end-0 h-full w-3/4 max-w-sm border-s border-(--card-border) data-open:slide-in-from-end data-closed:slide-out-to-end',
        bottom:
          'inset-x-0 bottom-0 max-h-[85svh] rounded-t-xl border-t border-(--card-border) pb-[env(safe-area-inset-bottom)] data-open:slide-in-from-bottom data-closed:slide-out-to-bottom',
      },
    },
    defaultVariants: {
      side: 'start',
    },
  },
);

export type SheetContentProps = ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'start' | 'end' | 'bottom';
  /** Names the close button in the corner. Without it, the sheet has no such button. */
  closeLabel?: string;
};

export function SheetContent({
  className,
  children,
  side = 'start',
  closeLabel,
  ...props
}: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay data-slot="sheet-overlay" className={overlayClasses} />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          sheetVariants({ side }),
          // The header keeps clear of the close button in the corner.
          closeLabel !== undefined && '*:data-[slot=sheet-header]:pe-12',
          className,
        )}
        {...props}
      >
        {/* A bottom sheet shows a handle, as phones do; it is only a cue and does not drag. */}
        {side === 'bottom' && (
          <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border" />
        )}
        {children}
        {closeLabel !== undefined && (
          <SheetPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={closeLabel}
              className="absolute top-3 end-3 size-8 pointer-coarse:size-(--control-height)"
            >
              <XIcon aria-hidden />
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="sheet-header" className={cn('flex flex-col gap-1 p-4', className)} {...props} />
  );
}

/** The sheet's content between its header and footer; it scrolls when the sheet is full. */
export function SheetBody({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-body"
      className={cn('min-h-0 flex-1 overflow-y-auto px-4', className)}
      {...props}
    />
  );
}

export function SheetFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  );
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-heading-3', className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-body-sm text-muted-foreground', className)}
      {...props}
    />
  );
}
