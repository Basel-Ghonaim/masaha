import type { ManagedAnnouncement } from '@masaha/shared/announcements';
import { Button } from '@shared/design-system';
import { useLayoutEffect, useRef } from 'react';
import type { OpenCardDialog } from '../../types/CardDialog';

/**
 * «تمديد الاشتراكات» (outline), which opens the extension's dialog, held by the list so that it stays
 * open whatever the list's refetch makes of the card (a refusal stays in it). Once the button is gone
 * with the focus on it — the closure extended, its card now saying so — the card's first other action
 * takes the focus.
 */
export function ExtensionAction({
  closure,
  cardKey,
  label,
  openDialog,
}: {
  closure: ManagedAnnouncement;
  cardKey: string;
  label: string;
  openDialog: OpenCardDialog;
}) {
  const trigger = useRef<HTMLButtonElement | null>(null);

  // Leaving while it holds the focus, it hands the focus to the card's next action.
  useLayoutEffect(() => {
    const button = trigger.current;
    return () => {
      if (button === null || button !== document.activeElement) return;
      const card = button.closest('[data-card-key]');
      const next = [...(card?.querySelectorAll<HTMLElement>('[data-card-action]') ?? [])].find(
        (action) => action !== button,
      );
      next?.focus();
    };
  }, []);

  return (
    <Button
      ref={trigger}
      variant="outline"
      className="self-start"
      data-card-action=""
      onClick={(event) => {
        openDialog({ kind: 'extension', closure }, cardKey, event.currentTarget);
      }}
    >
      {label}
    </Button>
  );
}
