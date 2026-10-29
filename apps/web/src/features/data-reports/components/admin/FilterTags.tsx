import { Button, FilterTag } from '@shared/design-system';
import { useLayoutEffect, useRef } from 'react';
import type { AdminReportsView } from '../../hooks/admin/useAdminReports';

/**
 * The filters in force, at every width (DI-40, finding 8): the space and the field as removable tags,
 * and «مسح الفلاتر» beside them. Nothing while none applies. A tag removed, or «مسح الفلاتر» pressed,
 * leaves under the focus: the next tag's remove button takes it, else «مسح الفلاتر», else
 * `onEmptied` (the count).
 */
export function FilterTags({
  tags,
  clear,
  onEmptied,
}: {
  tags: AdminReportsView['tags'];
  clear: AdminReportsView['clear'];
  onEmptied: () => void;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  /** The place of the tag removed (`tags.length` for «مسح الفلاتر»), until the next drawing. */
  const removed = useRef<number | null>(null);

  // After the address has changed: the button now at the removed one's place, else the clear, else
  // the count.
  useLayoutEffect(() => {
    const at = removed.current;
    if (at === null) return;
    removed.current = null;
    const buttons = [...(box.current?.querySelectorAll<HTMLElement>('button') ?? [])];
    const next = buttons[Math.min(at, buttons.length - 1)];
    if (next === undefined) onEmptied();
    else next.focus();
  });

  if (tags.length === 0) return null;
  return (
    <div ref={box} className="flex flex-wrap items-center gap-2">
      {tags.map((tag, index) => (
        <FilterTag
          key={tag.key}
          removeLabel={tag.removeLabel}
          onRemove={() => {
            removed.current = index;
            tag.remove();
          }}
        >
          {tag.label}
        </FilterTag>
      ))}
      {clear !== null && (
        <Button
          variant="link"
          size="sm"
          onClick={() => {
            removed.current = tags.length;
            clear.run();
          }}
        >
          {clear.label}
        </Button>
      )}
    </div>
  );
}
