import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

export type TooltipProps = ComponentProps<typeof TooltipPrimitive.Root> &
  Pick<ComponentProps<typeof TooltipPrimitive.Provider>, 'delayDuration'>;

/**
 * A short hint shown when its trigger is hovered or focused. It only supplements: touch screens
 * cannot open it, so it never holds information or an action that is not available without it
 * (foundation §5). Each tooltip carries its own provider, so the app mounts nothing for it.
 */
export function Tooltip({ delayDuration, ...props }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipPrimitive.Provider>
  );
}

/** The element the hint describes. With `asChild`, it is the child itself, such as a Button. */
export function TooltipTrigger(props: ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/** The hint, portalled to <body> on the dropdown layer, so one opened from a dialog shows over it. */
export function TooltipContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          // data-side names the physical side the hint opened on, in either direction, so these
          // slide-ins are not reversed in RTL.
          'z-(--z-dropdown) inline-flex w-fit max-w-xs origin-(--radix-tooltip-content-transform-origin) items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-caption text-background duration-(--duration-short) ease-(--easing-standard) data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="size-2.5 translate-y-[calc(-50%-(--spacing(0.5)))] rotate-45 rounded-sm bg-foreground fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
