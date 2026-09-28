import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { XIcon } from '../../icons';
import { cn } from '../../lib/cn';
import { Button } from '../Button';

/**
 * A modal window for a short task that needs the user's attention before they go on. It traps the
 * focus while open and returns it to its trigger when it closes. For a confirmation that must be
 * answered, use AlertDialog.
 */
export function Dialog(props: ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

export function DialogTrigger(props: ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

export function DialogClose(props: ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/**
 * The dimming layer behind every modal overlay (Dialog, AlertDialog, Sheet): the scrim token on the
 * overlay layer, below the modal content.
 */
export const overlayClasses =
  'fixed inset-0 z-(--z-overlay) bg-(--overlay-scrim) duration-(--duration-short) ease-(--easing-standard) data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0';

/** The window's surface, centred on the modal layer. Shared with AlertDialog. */
export const modalContentClasses =
  'fixed top-1/2 start-1/2 z-(--z-modal) grid w-full max-w-[calc(100%-(--spacing(8)))] -translate-x-1/2 -translate-y-1/2 gap-6 rounded-xl border border-(--card-border) bg-popover p-6 text-body text-popover-foreground shadow-overlay duration-(--duration-short) ease-(--easing-standard) outline-none sm:max-w-md rtl:translate-x-1/2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95';

export type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  /** Names the close button in the corner. Without it, the dialog has no such button. */
  closeLabel?: string;
};

export function DialogContent({ className, children, closeLabel, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay data-slot="dialog-overlay" className={overlayClasses} />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          modalContentClasses,
          // The header keeps clear of the close button in the corner.
          closeLabel !== undefined && '*:data-[slot=dialog-header]:pe-8',
          className,
        )}
        {...props}
      >
        {children}
        {closeLabel !== undefined && (
          <DialogPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={closeLabel}
              className="absolute top-3 end-3 size-8 pointer-coarse:size-(--control-height)"
            >
              <XIcon aria-hidden />
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="dialog-header" className={cn('flex flex-col gap-2', className)} {...props} />
  );
}

/** The actions, at the end of the window: stacked on a phone with the main action on top. */
export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-heading-3', className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-body text-muted-foreground', className)}
      {...props}
    />
  );
}
