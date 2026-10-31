import type { SubscriptionState } from '@masaha/shared/subscriptions';
import { useCopy } from '@shared/copy';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EllipsisVerticalIcon,
} from '@shared/design-system';
import { isolate } from '@shared/localisation';
import { useRef, useState } from 'react';
import { CorrectSheet } from './CorrectSheet';

/**
 * A subscription card's «⋯», named by the subscription (DI11): «تصحيح الاشتراك», the staff's, opening
 * its correction; on one ended early held, with «انتهى الاشتراك مبكرًا» — the server refuses it
 * (DI13); an expired one may still be corrected. The sheet, closed, gives the focus back to «⋯»:
 * the menu item that opened it has left the page.
 */
export function CorrectAction({
  spaceId,
  subscription,
  owner,
}: {
  spaceId: number;
  subscription: SubscriptionState;
  owner: boolean;
}) {
  const copy = useCopy();
  const words = copy.desk.correct;
  const label = copy.desk.customer.menu.label({ name: isolate(subscription.name) });
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const ended = subscription.ended !== null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button ref={trigger} variant="ghost" size="icon" aria-label={label}>
            <EllipsisVerticalIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" aria-label={label}>
          <DropdownMenuItem
            held={ended}
            className={ended ? 'flex-col items-start gap-0.5' : undefined}
            onSelect={() => {
              setOpen(true);
            }}
          >
            {words.action}
            {ended && <span className="text-caption text-muted-foreground">{words.ended}</span>}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {open && (
        <CorrectSheet
          spaceId={spaceId}
          subscription={subscription}
          owner={owner}
          onClose={() => {
            setOpen(false);
          }}
          returnFocus={() => trigger.current}
        />
      )}
    </>
  );
}
