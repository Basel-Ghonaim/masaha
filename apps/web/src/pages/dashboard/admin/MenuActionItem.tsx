import type { UserActionItem, UserActionLead } from '@features/space-links';
import { DropdownMenuItem } from '@shared/design-system';
import { Link } from 'react-router';

/**
 * One item of a person's menu, from either capability: its label, and, when it is held, why, under
 * it (foundation §10), the held item reached by the keyboard with its reason (`held`, D6.15); a held item's way out (`lead`) follows it as an item of its own, a link to
 * the page where what holds it is undone. A destructive item takes the menu's destructive variant.
 */
export function MenuActionItem({
  item,
  destructive = false,
}: {
  item: UserActionItem & { lead?: UserActionLead };
  destructive?: boolean;
}) {
  return (
    <>
      <DropdownMenuItem
        // Held, not disabled: the item stays in the arrow keys, so its reason is reached (finding 105).
        held={item.disabled}
        variant={destructive ? 'destructive' : 'default'}
        onSelect={item.run}
      >
        <span className="flex flex-col">
          <span>{item.label}</span>
          {item.reason !== undefined && (
            <span className="text-caption text-muted-foreground">{item.reason}</span>
          )}
        </span>
      </DropdownMenuItem>
      {item.lead !== undefined && (
        <DropdownMenuItem asChild>
          <Link to={item.lead.to}>{item.lead.label}</Link>
        </DropdownMenuItem>
      )}
    </>
  );
}
