import type { SessionSpaceLink } from '@masaha/shared/space-links';
import {
  Button,
  CheckIcon,
  ChevronsUpDownIcon,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  SidebarText,
  Skeleton,
  TriangleAlertIcon,
} from '@shared/design-system';
import { Link } from 'react-router';
import { useSpaceSwitcher } from '../hooks/useSpaceSwitcher';
import { SpaceHead } from './SpaceHead';
import { SpaceName } from './SpaceName';

/**
 * The dashboard sidebar's header for a space: the space in the URL (`spaceId`), its name and area.
 * With another space to choose, it opens the user's spaces, and choosing one follows its link
 * (`spaceLink`, which the page gives): the switcher holds no state of its own (ADR 0016).
 */
export function SpaceSwitcher({
  spaceId,
  spaceLink,
}: {
  spaceId: number | undefined;
  spaceLink: (space: SessionSpaceLink) => string;
}) {
  const switcher = useSpaceSwitcher(spaceId);

  if (switcher.status === 'loading') {
    return (
      <div
        role="status"
        aria-label={switcher.loadingLabel}
        aria-busy
        className="flex items-center gap-3 p-1.5"
      >
        <Skeleton className="size-9 shrink-0" />
        <SidebarText className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </SidebarText>
      </div>
    );
  }

  if (switcher.status === 'error') {
    // On the rail the words are kept for assistive technology, and the retry shows as its icon.
    return (
      <div className="flex flex-col items-start gap-2 p-1.5">
        <SidebarText role="alert" className="text-caption text-destructive">
          {switcher.failure}
        </SidebarText>
        <Button variant="outline" size="sm" onClick={switcher.retry}>
          <TriangleAlertIcon aria-hidden />
          <SidebarText>{switcher.retryLabel}</SidebarText>
        </Button>
      </div>
    );
  }

  if (!switcher.canSwitch) {
    return switcher.current ? (
      <div className="flex items-center gap-3 p-1.5">
        <SpaceHead space={switcher.current} fallback={switcher.chooseLabel} />
      </div>
    ) : null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={switcher.triggerLabel}
          className="h-auto w-full justify-start gap-3 p-1.5"
        >
          <SpaceHead space={switcher.current} fallback={switcher.chooseLabel} />
          <SidebarText>
            <ChevronsUpDownIcon aria-hidden className="size-4 text-muted-foreground" />
          </SidebarText>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>{switcher.listLabel}</DropdownMenuLabel>
        {switcher.spaces.map((space) => (
          <DropdownMenuItem key={space.spaceId} asChild>
            <Link to={spaceLink(space)} aria-current={space.isCurrent ? 'true' : undefined}>
              <span className="flex min-w-0 flex-1 flex-col">
                <SpaceName space={space} />
                <span className="text-caption text-muted-foreground">{space.area}</span>
              </span>
              {space.isCurrent && <CheckIcon aria-hidden />}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
