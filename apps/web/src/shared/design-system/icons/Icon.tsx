import type { LucideIcon, LucideProps } from 'lucide-react';
import { useDirection } from '../components/DirectionProvider';
import { cn } from '../lib/cn';

export type IconProps = LucideProps;

type IconWrapperProps = IconProps & {
  glyph: LucideIcon;
  /** The icon points along the reading direction, so it turns around in RTL. */
  mirror?: boolean;
};

/**
 * The one wrapper over the icon library (docs/frontend/design-system/foundation.md §8). A mirrored
 * icon flips horizontally when the direction is RTL; a flip, not a rotation, so icons that are not
 * symmetric top to bottom (log-in, log-out) keep their shape. Any other icon never flips.
 */
export function Icon({ glyph: Glyph, mirror = false, className, ...props }: IconWrapperProps) {
  const direction = useDirection();
  return (
    <Glyph className={cn(mirror && direction === 'rtl' && '-scale-x-100', className)} {...props} />
  );
}
