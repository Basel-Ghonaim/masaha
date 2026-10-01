import { Popover as PopoverPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../../lib/cn';

/**
 * A small floating panel opened from a button: the base of Combobox and DatePicker, and of any
 * panel a feature needs beside its trigger. Escape or a click outside closes it, and the focus
 * returns to the trigger.
 */
export function Popover(props: ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

export function PopoverTrigger(props: ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

/** Places the panel against something other than its trigger. */
export function PopoverAnchor(props: ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

/**
 * The panel, portalled to <body> on the dropdown layer, so one opened from a dialog shows over it.
 * It is a dialog, so it needs a name: `aria-label`, or `aria-labelledby` pointing at its title.
 * data-side names the physical side it opened on, in either direction, so the slide-ins are not
 * reversed in RTL.
 */
export function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-(--z-dropdown) flex w-72 origin-(--radix-popover-content-transform-origin) flex-col gap-4 rounded-lg border border-border bg-popover p-4 text-body text-popover-foreground shadow-floating outline-hidden duration-(--duration-short) ease-(--easing-standard) data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
