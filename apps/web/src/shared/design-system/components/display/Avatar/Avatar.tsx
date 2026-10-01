import { Avatar as AvatarPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../../lib/cn';

export type AvatarProps = ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: 'sm' | 'md' | 'lg';
};

/**
 * A person's picture, or their initials until it loads or when there is none. Compose it from
 * AvatarImage and AvatarFallback. When the person's name is shown beside it, hide it from assistive
 * technology with `aria-hidden`, so the name is not read twice.
 */
export function Avatar({ className, size = 'md', ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        'group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6',
        className,
      )}
      {...props}
    />
  );
}

/** The picture. Its `alt` is the person's name, from the catalogue or the data. */
export function AvatarImage({ className, ...props }: ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full object-cover', className)}
      {...props}
    />
  );
}

/** The initials, shown while the picture loads, when it fails, or when there is none. */
export function AvatarFallback({
  className,
  ...props
}: ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center rounded-full bg-muted text-caption text-muted-foreground group-data-[size=lg]/avatar:text-body-sm',
        className,
      )}
      {...props}
    />
  );
}
