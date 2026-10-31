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
import { Link } from 'react-router';
import { useStaffActions } from '../hooks/access/useStaffActions';
import type { StaffDialog } from '../types/StaffDialog';

/**
 * A staff member's row menu, «إجراءات: {name}»: a held item says why under it (foundation §10)
 * and stays in the arrow keys' path, so its reason is reached (D3.3, finding 105); «عرض مقبوضاته»
 * leads to the ledger of the person's collections this month (D5.6),
 * and a destructive one comes last, after a separator. While an action of the row waits, the
 * button is busy — still in the focus order, but the menu does not open. Its dialogs open where the
 * list holds them (`open`); the button is the list's to find again (`triggerRef`).
 */
export function StaffActionsMenu({
  spaceId,
  member,
  collectionsLink,
  open,
  triggerRef,
}: {
  spaceId: number;
  member: StaffMember;
  /** The ledger of what the person collected this month, «عرض مقبوضاته»'s. */
  collectionsLink: string;
  open: (dialog: StaffDialog) => void;
  triggerRef: Ref<HTMLButtonElement>;
}) {
  const actions = useStaffActions(spaceId, member, { open, collectionsLink });
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
            {item.href !== undefined ? (
              <DropdownMenuItem asChild>
                <Link to={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                held={item.held}
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
            )}
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
