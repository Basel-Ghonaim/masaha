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
import { Link } from 'react-router';
import { useSpaceActionsMenu } from '../../hooks/menu/useSpaceActionsMenu';
import type { SpaceRef } from '../../types/SpaceRef';
import { DeleteSpaceDialog } from '../delete/DeleteSpaceDialog';

/**
 * A space's row actions, for the admin's list: Edit, which leads to the space's editor (`editLink`, the
 * page's path), Hide or Show, then Delete, which asks first. A deleted space's row has no menu and
 * one action, **Restore**, which brings the space back as it was; while it waits its button stays
 * where it is, busy, and keeps the focus, and a 429's wait holds it like every row's.
 *
 * While a live space's action is pending its button stays where it is, busy, and keeps the focus; the
 * actions wait, as they do while any 429 counts down, but Edit, a way to a page, never does.
 */
export function SpaceActionsMenu({ space, editLink }: { space: SpaceRef; editLink: string }) {
  const menu = useSpaceActionsMenu(space);
  const trigger = useRef<HTMLButtonElement>(null);

  if (menu.deleted) {
    return (
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={menu.trigger.label}
          aria-busy={menu.trigger.busy || undefined}
          // Waiting, not disabled: the button keeps its place in the focus order.
          aria-disabled={menu.waiting || undefined}
          onClick={() => {
            if (!menu.waiting) menu.restore.run();
          }}
        >
          {menu.trigger.busy ? (
            <LoaderIcon aria-hidden className="motion-safe:animate-spin" />
          ) : null}
          {menu.restore.label}
        </Button>
      </div>
    );
  }

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
          <DropdownMenuItem asChild>
            <Link to={editLink}>{menu.edit}</Link>
          </DropdownMenuItem>
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
