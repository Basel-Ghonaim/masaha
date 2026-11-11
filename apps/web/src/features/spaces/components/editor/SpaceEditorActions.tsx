import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EllipsisVerticalIcon,
  useMediaQuery,
} from '@shared/design-system';
import { useRef } from 'react';
import { useSpaceEditorActions } from '../../hooks/editor/useSpaceEditorActions';
import { DeleteSpaceDialog } from '../delete/DeleteSpaceDialog';

/**
 * The admin's actions on a space, for its profile's top bar (H4): from 768 px two buttons, «إخفاء عن
 * الزوار» (or «إظهار للزوار») and «حذف المساحة»; below it one menu, «إجراءات الصفحة», holding both.
 * The delete asks first; the focus returns to what opened it. While an action waits, its control is
 * marked, never disabled, so the keyboard keeps its place.
 */
export function SpaceEditorActions({
  spaceId,
  deletedLink,
}: {
  spaceId: number;
  /** The spaces list's deleted spaces, where a deleted space can be restored. */
  deletedLink: string;
}) {
  const actions = useSpaceEditorActions(spaceId, deletedLink);
  const wide = useMediaQuery('(min-width: 768px)');
  const opener = useRef<HTMLButtonElement>(null);
  if (actions === null) return null;
  const wait = (run: () => void) => () => {
    if (!actions.waiting) run();
  };
  // A menu item that waits stays open on a choice, so nothing happens and nothing moves.
  const waitInMenu = (run: () => void) => (event: Event) => {
    if (actions.waiting) {
      event.preventDefault();
      return;
    }
    run();
  };

  return (
    <div className="ms-auto flex items-center gap-2">
      {wide ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-disabled={actions.waiting || undefined}
            onClick={wait(actions.toggle.run)}
          >
            {actions.toggle.label}
          </Button>
          <Button
            ref={opener}
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive"
            aria-disabled={actions.waiting || undefined}
            onClick={wait(actions.remove.run)}
          >
            {actions.remove.label}
          </Button>
        </>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button ref={opener} variant="ghost" size="icon" aria-label={actions.menu}>
              <EllipsisVerticalIcon aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              aria-disabled={actions.waiting || undefined}
              onSelect={waitInMenu(actions.toggle.run)}
            >
              {actions.toggle.label}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              aria-disabled={actions.waiting || undefined}
              onSelect={waitInMenu(actions.remove.run)}
            >
              {actions.remove.label}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <DeleteSpaceDialog dialog={actions.dialog} returnFocus={opener} />
    </div>
  );
}
