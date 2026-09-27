import { Separator as SeparatorPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

export type SeparatorProps = ComponentProps<typeof SeparatorPrimitive.Root>;

/**
 * A line between content. It is decorative by default, so assistive technology skips it; with
 * `decorative={false}` it is announced as a separator.
 */
export function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: SeparatorProps) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch',
        className,
      )}
      {...props}
    />
  );
}
