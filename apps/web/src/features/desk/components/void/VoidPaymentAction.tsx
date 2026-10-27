import { useCopy } from '@shared/copy';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EllipsisVerticalIcon,
} from '@shared/design-system';
import { priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { useLayoutEffect, useRef, useState } from 'react';
import type { VoidTarget } from '../../types/VoidTarget';
import { VoidDialog } from './VoidDialog';

/**
 * A payment's «⋯», the owner's: named by the payment's amount and who (DI-9), holding «إلغاء الدفعة…»,
 * destructive, which opens its dialog. Closed, the focus goes back to the «⋯» (DI-8); once the «⋯» is
 * gone with the focus on it — the payment voided, its row struck or left — `onGone` places it.
 */
export function VoidPaymentAction({
  spaceId,
  payment,
  onGone,
}: {
  spaceId: number;
  payment: VoidTarget;
  onGone: () => void;
}) {
  const words = useCopy().desk.void;
  const language = useLanguage() === 'en' ? 'en' : 'ar';
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const gone = useRef(onGone);
  useLayoutEffect(() => {
    gone.current = onGone;
  });
  const label = words.menu({
    amount: isolate(priceText(payment.amountAgorot, language)),
    who: isolate(payment.who),
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
          <Button ref={trigger} variant="ghost" size="icon" aria-label={label} data-row-action="">
            <EllipsisVerticalIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" aria-label={label}>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              setOpen(true);
            }}
          >
            {words.action}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {open && (
        <VoidDialog
          spaceId={spaceId}
          payment={payment}
          onClose={() => {
            setOpen(false);
          }}
          returnFocus={() => {
            if (trigger.current?.isConnected === true) trigger.current.focus();
            else onGone();
          }}
        />
      )}
    </>
  );
}
