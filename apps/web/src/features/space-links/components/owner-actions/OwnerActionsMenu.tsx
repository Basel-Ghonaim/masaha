import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EllipsisVerticalIcon,
} from '@shared/design-system';
import { useRef } from 'react';
import { useOwnerActions } from '../../hooks/owner-actions/useOwnerActions';
import type { UserRowView } from '../../types/UserRowView';
import { LinkOwnerDialog } from '../link/LinkOwnerDialog';
import { NamedLine } from '../NamedLine';
import { UnlinkOwnerDialog } from '../unlink/UnlinkOwnerDialog';

/**
 * An owner's row actions on the owners page: link them to a space, or unlink them from one of
 * theirs, each in its dialog, after which the focus returns to the menu's button. A suspended
 * account cannot be linked, and the item says why.
 */
export function OwnerActionsMenu({ row }: { row: UserRowView }) {
  const actions = useOwnerActions(row);
  const trigger = useRef<HTMLButtonElement>(null);
  const { dialog } = actions;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button ref={trigger} variant="ghost" size="icon" aria-label={actions.trigger.label}>
            <EllipsisVerticalIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={actions.link.disabled} onSelect={actions.link.open}>
            <span className="flex flex-col">
              <span>{actions.link.label}</span>
              {actions.link.reason !== undefined && (
                <span className="text-caption text-muted-foreground">{actions.link.reason}</span>
              )}
            </span>
          </DropdownMenuItem>
          {actions.unlinks.length > 0 && <DropdownMenuSeparator />}
          {actions.unlinks.map((unlink) => (
            <DropdownMenuItem key={unlink.key} variant="destructive" onSelect={unlink.open}>
              <span>
                <NamedLine line={unlink.label} />
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog?.kind === 'link' && (
        <LinkOwnerDialog target={dialog.target} onClose={actions.close} returnFocus={trigger} />
      )}
      {dialog?.kind === 'unlink' && (
        <UnlinkOwnerDialog
          space={dialog.space}
          owner={dialog.owner}
          onClose={actions.close}
          returnFocus={trigger}
        />
      )}
    </>
  );
}
