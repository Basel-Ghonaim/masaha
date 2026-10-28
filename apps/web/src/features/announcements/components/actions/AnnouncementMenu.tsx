import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EllipsisVerticalIcon,
} from '@shared/design-system';
import { useLayoutEffect, useRef } from 'react';
import type { AnnouncementActionsView } from '../../hooks/actions/useAnnouncementActions';
import type { AnnouncementCardView } from '../../types/AnnouncementCardView';
import type { OpenCardDialog } from '../../types/CardDialog';

/**
 * A card's «⋯», named by its announcement («إجراءات أخرى: {type} · {period}»), holding «حذف…»,
 * destructive, which opens the delete's dialog, held by the list so that it stays open whatever the
 * list's refetch makes of the card (a refusal stays in it). Once the «⋯» is gone with the focus on it
 * — the announcement deleted, its card gone — `onGone` places it.
 */
export function AnnouncementMenu({
  card,
  menu,
  openDialog,
  onGone,
}: {
  card: AnnouncementCardView;
  menu: AnnouncementActionsView['menu'] & {
    remove: NonNullable<AnnouncementActionsView['menu']['remove']>;
  };
  openDialog: OpenCardDialog;
  onGone: () => void;
}) {
  const trigger = useRef<HTMLButtonElement | null>(null);
  const gone = useRef(onGone);
  useLayoutEffect(() => {
    gone.current = onGone;
  });

  // Leaving while it holds the focus, it hands the focus on, before the browser drops it on the body.
  useLayoutEffect(() => {
    const button = trigger.current;
    return () => {
      if (button !== null && button === document.activeElement) gone.current();
    };
  }, []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={trigger}
            variant="ghost"
            size="icon"
            aria-label={menu.label}
            data-card-action=""
          >
            <EllipsisVerticalIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" aria-label={menu.label}>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              if (trigger.current !== null) {
                openDialog({ kind: 'delete', card }, card.key, trigger.current);
              }
            }}
          >
            {menu.remove.label}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
