import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EllipsisVerticalIcon,
  LoaderIcon,
} from '@shared/design-system';
import { useRef } from 'react';
import { useSpaceActionsMenu } from '../../hooks/menu/useSpaceActionsMenu';
import type { SpaceRef } from '../../types/SpaceRef';
import { DeleteSpaceDialog } from '../delete/DeleteSpaceDialog';

/**
 * A space's row menu, for the admin's list: Hide or Show, then Delete, which asks first. While the
 * row's action is pending its button stays where it is, busy, and keeps the focus; the items wait,
 * as they do while any 429 counts down.
 */
export function SpaceActionsMenu({ space }: { space: SpaceRef }) {
  const menu = useSpaceActionsMenu(space);
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={trigger}
            variant="ghost"
            size="icon"
            aria-label={menu.trigger.label}
            aria-busy={menu.trigger.busy || undefined}
          >
            {menu.trigger.busy ? (
              <LoaderIcon aria-hidden className="motion-safe:animate-spin" />
            ) : (
              <EllipsisVerticalIcon aria-hidden />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={menu.waiting} onSelect={menu.toggle.run}>
            {menu.toggle.label}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={menu.waiting}
            onSelect={menu.remove.run}
          >
            {menu.remove.label}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteSpaceDialog dialog={menu.dialog} returnFocus={trigger} />
    </>
  );
}
