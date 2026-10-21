import type { StaffMember } from '@masaha/shared/space-links';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EllipsisVerticalIcon,
} from '@shared/design-system';
import { Fragment, useState, type Ref } from 'react';
import { useStaffActions } from '../hooks/access/useStaffActions';
import type { StaffDialog } from '../types/StaffDialog';

/**
 * A staff member's row menu, «إجراءات: {name}»: a held item says why under it (foundation §10),
 * and a destructive one comes last, after a separator. While an action of the row waits, the
 * button is busy — still in the focus order, but the menu does not open. Its dialogs open where the
 * list holds them (`open`); the button is the list's to find again (`triggerRef`).
 */
export function StaffActionsMenu({
  spaceId,
  member,
  open,
  triggerRef,
}: {
  spaceId: number;
  member: StaffMember;
  open: (dialog: StaffDialog) => void;
  triggerRef: Ref<HTMLButtonElement>;
}) {
  const actions = useStaffActions(spaceId, member, { open });
  const [shown, setShown] = useState(false);
  const { busy } = actions.trigger;

  return (
    <DropdownMenu
      open={shown && !busy}
      onOpenChange={(next) => {
        setShown(next && !busy);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon"
          aria-label={actions.trigger.label}
          aria-disabled={busy || undefined}
          aria-busy={busy || undefined}
        >
          <EllipsisVerticalIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.items.map((item) => (
          <Fragment key={item.label}>
            {item.destructive && <DropdownMenuSeparator />}
            <DropdownMenuItem
              disabled={item.disabled}
              variant={item.destructive ? 'destructive' : 'default'}
              onSelect={item.run}
            >
              <span className="flex flex-col">
                <span>{item.label}</span>
                {item.reason !== undefined && (
                  <span className="text-caption text-muted-foreground">{item.reason}</span>
                )}
              </span>
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
