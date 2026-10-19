import type { UserActionItem } from '@features/space-links';
import { DropdownMenuItem } from '@shared/design-system';

/**
 * One item of a person's menu, from either capability: its label, and, when it is held, why, under
 * it (foundation §10). A destructive item takes the menu's destructive variant.
 */
export function MenuActionItem({
  item,
  destructive = false,
}: {
  item: UserActionItem;
  destructive?: boolean;
}) {
  return (
    <DropdownMenuItem
      disabled={item.disabled}
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
  );
}
