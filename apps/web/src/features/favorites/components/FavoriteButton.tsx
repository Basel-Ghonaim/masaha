import { Button, cn, HeartIcon } from '@shared/design-system';
import { useFavoriteToggle } from '../hooks/toggle/useFavoriteToggle';
import type { FavoriteSignIn, HeartSpace } from '../types/FavoriteSpace';

/**
 * The heart (PU-014): a toggle named by what it does to the space, «حفظ {name} في المفضّلة» or
 * «إزالة {name} من المفضّلة», pressed (`aria-pressed`, the heart filled) while the space is saved; the
 * layer's icon button, 44 × 44 on a coarse pointer (DI-51). The caller places it (`className`).
 */
export function FavoriteButton({
  space,
  saved,
  signIn,
  manage,
  className,
}: {
  space: HeartSpace;
  saved: boolean;
  signIn: FavoriteSignIn;
  manage: () => void;
  className?: string;
}) {
  const heart = useFavoriteToggle({ space, saved, signIn, manage });

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-pressed={heart.pressed}
      aria-label={heart.label}
      className={className}
      onClick={heart.run}
    >
      <HeartIcon aria-hidden className={cn(heart.pressed && 'fill-current text-primary')} />
    </Button>
  );
}
