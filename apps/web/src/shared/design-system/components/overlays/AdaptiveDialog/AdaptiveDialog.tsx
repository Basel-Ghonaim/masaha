import { Dialog as DialogPrimitive } from 'radix-ui';
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from 'react';
import { XIcon } from '../../../icons';
import { cn } from '../../../lib/cn';
import { useMediaQuery } from '../../../lib/useMediaQuery';
import { Button } from '../../actions/Button';
import { modalContentClasses, overlayClasses } from '../Dialog';
import { useHistoryEntry, watchStaleEntries } from './historyEntry';
import { listenForPresses, openerNow } from './opener';

/** The width from which it is a dialog; below it, a full-screen panel. Tailwind's `md`. */
const WIDE = '(min-width: 768px)';

type Shared = {
  /** Closing is held: a request is in flight. */
  busy: boolean;
  /** What opened it, which takes the focus back when it closes. */
  opener: RefObject<HTMLElement | null>;
};

const SharedContext = createContext<Shared | null>(null);

function useShared(): Shared {
  const shared = useContext(SharedContext);
  if (shared === null) throw new Error('AdaptiveDialog parts must be inside an AdaptiveDialog.');
  return shared;
}

export type AdaptiveDialogProps = {
  open: boolean;
  /** Called with `false` on every way of closing: its button, Escape, the scrim, Back. */
  onOpenChange: (open: boolean) => void;
  /** Holds it open while a request is in flight: no way of closing works until it ends. */
  busy?: boolean;
  children: ReactNode;
};

/**
 * A modal dialog whose form follows the width: from 768 px the layer's centred dialog, below it a
 * full-screen panel with a top bar that holds its close button, made for a task a phone gives the
 * whole screen to (a sign-in over the page). It traps the focus while open and gives it back to
 * whatever opened it, however it closes. Open, it holds one history entry at the same address, so
 * Back closes it. Open and closed by its caller.
 */
export function AdaptiveDialog({
  open,
  onOpenChange,
  busy = false,
  children,
}: AdaptiveDialogProps) {
  const opener = useRef<HTMLElement | null>(null);

  useEffect(listenForPresses, []);
  // Back closes it, unless it is busy (architecture §2, *An overlay's history entry*).
  useHistoryEntry(
    open,
    () => {
      onOpenChange(false);
    },
    () => busy,
  );
  // After the entry's own effect, so a second run of both (StrictMode) finds its entry held again.
  useEffect(watchStaleEntries, []);
  // Read before the dialog moves the focus inside it, which Radix does in an effect of its own.
  useLayoutEffect(() => {
    if (open) opener.current = openerNow();
  }, [open]);

  return (
    <SharedContext.Provider value={{ busy, opener }}>
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          // Every way of closing reaches here (Escape, the scrim, the close button): held while busy.
          if (!next && busy) return;
          onOpenChange(next);
        }}
      >
        {children}
      </DialogPrimitive.Root>
    </SharedContext.Provider>
  );
}

// From 768 px: the layer's dialog, a step wider (30 rem, room for a sign-in's form) and more padded.
const dialogClasses = cn(modalContentClasses, 'p-8 sm:max-w-120');

// Below 768 px: the whole screen, its own height (the phone's toolbars counted), no radius and no
// edge; it rises a little and fades in, on the motion tokens, so reduced motion shows it at once.
const panelClasses =
  'fixed inset-0 z-(--z-modal) flex h-dvh w-full flex-col bg-popover text-body text-popover-foreground outline-none duration-(--duration-medium) ease-(--easing-standard) data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-6 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-6';

export type AdaptiveDialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  /** Names the close button: in the corner of the dialog, in the panel's top bar. */
  closeLabel: string;
};

/**
 * The dialog's surface, portalled over the page with its scrim. The caller's content sits in one
 * body at both widths, so a change of width (a phone turned) restyles it without remounting what
 * it holds. In the panel the body scrolls under the top bar, clear of the phone's safe areas, and
 * the focus opens on the title, so the keyboard does not cover the screen at once; in the dialog
 * it opens as the caller's `onOpenAutoFocus` says, else on the first control.
 */
export function AdaptiveDialogContent({
  className,
  children,
  closeLabel,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: AdaptiveDialogContentProps) {
  const wide = useMediaQuery(WIDE);
  const { busy, opener } = useShared();

  const close = (
    <DialogPrimitive.Close asChild>
      <Button
        variant="ghost"
        size="icon"
        aria-label={closeLabel}
        disabled={busy}
        className={
          wide ? 'absolute top-3 end-3 size-8 pointer-coarse:size-(--control-height)' : 'size-11'
        }
      >
        <XIcon aria-hidden />
      </Button>
    </DialogPrimitive.Close>
  );

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay data-slot="adaptive-dialog-overlay" className={overlayClasses} />
      <DialogPrimitive.Content
        data-slot="adaptive-dialog-content"
        data-form={wide ? 'dialog' : 'panel'}
        className={cn(
          wide ? dialogClasses : panelClasses,
          // The header keeps clear of the close button in the dialog's corner.
          wide && '[&_[data-slot=adaptive-dialog-header]]:pe-8',
          className,
        )}
        onOpenAutoFocus={(event) => {
          if (wide) {
            onOpenAutoFocus?.(event);
            return;
          }
          const title =
            event.target instanceof HTMLElement
              ? event.target.querySelector<HTMLElement>('[data-slot="adaptive-dialog-title"]')
              : null;
          if (title === null) return;
          event.preventDefault();
          title.focus();
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          if (event.defaultPrevented) return;
          // Radix gives the focus back only to a Radix trigger; this goes back to any opener.
          event.preventDefault();
          if (opener.current?.isConnected === true) opener.current.focus();
        }}
        {...props}
      >
        {!wide && (
          <div
            data-slot="adaptive-dialog-bar"
            className="box-content flex h-14 flex-none items-center border-b border-border px-2 pt-[env(safe-area-inset-top)]"
          >
            {close}
          </div>
        )}
        <div
          data-slot="adaptive-dialog-body"
          className={
            wide
              ? 'grid min-w-0 grid-cols-1 gap-6'
              : 'flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-5 pt-6 pb-[calc(--spacing(6)+env(safe-area-inset-bottom))]'
          }
        >
          {children}
        </div>
        {wide && close}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function AdaptiveDialogHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="adaptive-dialog-header"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

/**
 * The dialog's name, the panel's first words: where the focus lands on a phone, so it takes the
 * focus without being a control, and shows no ring, as a page's `main` does.
 */
export function AdaptiveDialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="adaptive-dialog-title"
      tabIndex={-1}
      className={cn('text-heading-1 outline-none md:text-heading-2', className)}
      {...props}
    />
  );
}

export function AdaptiveDialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="adaptive-dialog-description"
      className={cn('text-body text-muted-foreground', className)}
      {...props}
    />
  );
}

/** The actions, at the end: stacked in the panel with the main action on top, in a row from 768 px. */
export function AdaptiveDialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="adaptive-dialog-footer"
      className={cn('flex flex-col-reverse gap-2 md:flex-row md:justify-end', className)}
      {...props}
    />
  );
}
