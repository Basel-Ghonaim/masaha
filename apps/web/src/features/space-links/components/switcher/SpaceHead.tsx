import { SidebarText } from '@shared/design-system';
import type { SpaceChoice } from '../../types/SpaceChoice';
import { SpaceName } from './SpaceName';

/** The space's mark, its initial on a square, and beside it the name and area (not on the rail). */
export function SpaceHead({
  space,
  fallback,
}: {
  space: SpaceChoice | undefined;
  fallback: string;
}) {
  return (
    <>
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-label text-primary-foreground"
      >
        {space?.initial}
      </span>
      <SidebarText className="flex min-w-0 flex-1 flex-col text-start">
        {space ? (
          <>
            <SpaceName space={space} className="truncate text-label" />
            <span className="truncate text-caption text-muted-foreground">{space.area}</span>
          </>
        ) : (
          <span className="truncate text-label">{fallback}</span>
        )}
      </SidebarText>
    </>
  );
}
