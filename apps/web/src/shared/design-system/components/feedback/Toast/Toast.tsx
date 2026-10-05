import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'sonner';
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  LoaderIcon,
  TriangleAlertIcon,
  XIcon,
} from '../../../icons';
import { useDirection } from '../../../lib/DirectionProvider';

export { toast } from 'sonner';

type Side = 'start' | 'center' | 'end';

export type ToasterProps = Omit<
  SonnerProps,
  | 'position'
  | 'dir'
  | 'theme'
  | 'richColors'
  | 'icons'
  | 'closeButton'
  | 'customAriaLabel'
  | 'containerAriaLabel'
> & {
  /** Names the region the toasts are announced in ("Notifications"). */
  label: string;
  /** Labels each toast's close button. Without it, toasts have none and close on their own. */
  closeLabel?: string;
  /** The logical corner, resolved against the reading direction. */
  position?: `${'top' | 'bottom'}-${Side}`;
};

// Sonner names physical sides; the start side is the left in LTR and the right in RTL.
function physicalSide(side: Side, direction: 'ltr' | 'rtl') {
  if (side === 'center') return 'center';
  return (side === 'start') === (direction === 'ltr') ? 'left' : 'right';
}

// Unstyled, so the layer's tokens style every part. Each status is its subtle surface with the text
// foundation §5 verifies on it; the description and icon take that text colour too.
const CLASS_NAMES = {
  toast:
    'relative flex w-(--width) items-start gap-3 rounded-lg border border-border bg-popover p-4 text-body-sm text-popover-foreground shadow-floating has-data-close-button:pe-10',
  content: 'flex flex-1 flex-col gap-0.5',
  title: 'text-label',
  description: 'text-body-sm',
  icon: "mt-0.5 flex shrink-0 [&_svg:not([class*='size-'])]:size-4",
  success: 'border-success bg-success-subtle text-success-subtle-foreground',
  info: 'border-info bg-info-subtle text-info-subtle-foreground',
  warning: 'border-warning bg-warning-subtle text-warning-subtle-foreground',
  error: 'border-destructive bg-destructive-subtle text-destructive-subtle-foreground',
  actionButton:
    'inline-flex h-8 shrink-0 items-center rounded-(--radius-control) bg-primary px-3 text-label text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  closeButton:
    "absolute top-3 end-3 inline-flex size-6 items-center justify-center rounded-sm text-current opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&_svg:not([class*='size-'])]:size-4",
};

const ICONS = {
  success: <CircleCheckIcon aria-hidden />,
  info: <InfoIcon aria-hidden />,
  warning: <TriangleAlertIcon aria-hidden />,
  error: <CircleAlertIcon aria-hidden />,
  loading: <LoaderIcon aria-hidden className="motion-safe:animate-spin" />,
  close: <XIcon aria-hidden />,
};

/**
 * Where toasts appear. Mount one, at the app's root, and raise toasts with `toast()`,
 * `toast.success()`, `toast.error()` … It sits on the toast layer, above dialogs and menus.
 */
export function Toaster({
  label,
  closeLabel,
  position = 'bottom-end',
  toastOptions,
  style,
  ...props
}: ToasterProps) {
  const direction = useDirection();
  const [vertical, side] = position.split('-') as ['top' | 'bottom', Side];

  return (
    <Sonner
      dir={direction}
      position={`${vertical}-${physicalSide(side, direction)}`}
      customAriaLabel={label}
      closeButton={closeLabel !== undefined}
      icons={ICONS}
      // Sonner's own stylesheet sets a z-index far above every layer, and is inserted after ours,
      // so the toast layer is set inline.
      style={{ zIndex: 'var(--z-toast)', ...style }}
      toastOptions={{
        ...toastOptions,
        unstyled: true,
        closeButtonAriaLabel: closeLabel,
        classNames: { ...CLASS_NAMES, ...toastOptions?.classNames },
      }}
      {...props}
    />
  );
}
