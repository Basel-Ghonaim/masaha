import type { SpaceChoice } from '../../types/SpaceChoice';

/** A space's name, marked when it is not in the interface's language. */
export function SpaceName({ space, className }: { space: SpaceChoice; className?: string }) {
  return (
    <span lang={space.nameLanguage} dir={space.nameDir} className={className}>
      {space.name}
    </span>
  );
}
