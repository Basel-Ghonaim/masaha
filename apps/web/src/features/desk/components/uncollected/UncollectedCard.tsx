import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@shared/design-system';
import { ListPagination } from '@shared/lists';
import { useEffect, useId, useRef } from 'react';
import { useUncollectedCard } from '../../hooks/uncollected/useUncollectedCard';
import type { DeskAbilities } from '../../types/DeskAbilities';
import { CollectDialog } from '../collect/CollectDialog';
import { DebtDialog } from '../debt/DebtDialog';
import { WriteOffDialog } from '../write-off/WriteOffDialog';
import { UncollectedRow } from './UncollectedRow';

/**
 * «غير محصّل» (K6): a card named by its heading, which counts the visits (DI-3), with no description
 * (DI-2); three rows, then «عرض الكل» opens the page whole with its pages (DI-23). Its id is the
 * owner's overview's anchor: arriving there opens it and takes the focus to its heading (DI-19). A
 * closed dialog gives the focus back to the control that opened it, or — the row gone — to the
 * heading (DI-30).
 */
export function UncollectedCard({
  spaceId,
  abilities,
}: {
  spaceId: number;
  abilities: DeskAbilities;
}) {
  const card = useUncollectedCard(spaceId, abilities);
  const headingId = useId();
  const listId = useId();
  const heading = useRef<HTMLHeadingElement | null>(null);
  const trigger = useRef<HTMLElement | null>(null);

  const { arrivedAtCard } = card;
  useEffect(() => {
    if (arrivedAtCard) heading.current?.focus();
  }, [arrivedAtCard]);
  // The row whose control had the focus left the list: the focus goes to the heading.
  const keys = card.rows.map((row) => row.key).join(' ');
  useEffect(() => {
    const last = trigger.current;
    if (last !== null && !last.isConnected && document.activeElement === document.body) {
      trigger.current = null;
      heading.current?.focus();
    }
  }, [keys]);
  const returnFocus = () => {
    const last = trigger.current;
    if (last?.isConnected) last.focus();
    else heading.current?.focus();
  };
  const opened = (element: HTMLElement) => {
    trigger.current = element;
  };
  const { dialog } = card;

  return (
    <Card id={card.id} role="region" aria-labelledby={headingId}>
      <CardHeader>
        <CardTitle>
          <h2 ref={heading} id={headingId} tabIndex={-1}>
            {card.title}
          </h2>
        </CardTitle>
      </CardHeader>
      {card.refreshFailure !== null && (
        <CardContent>
          <p className="text-body-sm text-muted-foreground">{card.refreshFailure}</p>
        </CardContent>
      )}
      {card.state === 'loading' ? (
        <CardContent>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      ) : card.state === 'failed' ? (
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>{card.failure.title}</AlertTitle>
            <AlertDescription>
              {card.failure.message}
              {card.failure.reference !== undefined && (
                <span className="block">{card.failure.reference}</span>
              )}
            </AlertDescription>
            <AlertAction>
              <Button
                variant="outline"
                disabled={card.failure.blocked}
                onClick={card.failure.retry}
              >
                {card.failure.retryLabel}
              </Button>
            </AlertAction>
          </Alert>
        </CardContent>
      ) : card.state === 'empty' ? (
        <CardContent>
          <p className="text-body-sm text-muted-foreground">{card.empty}</p>
        </CardContent>
      ) : (
        <>
          <ul id={listId} aria-busy={card.busy || undefined} className="flex flex-col divide-y">
            {card.rows.map((row) => (
              <UncollectedRow key={row.key} row={row} opened={opened} />
            ))}
          </ul>
          {(card.toggle !== null || card.pagination !== null) && (
            <CardContent>
              {card.pagination !== null && <ListPagination pagination={card.pagination} />}
              {card.toggle !== null && (
                <Button
                  variant="ghost"
                  className="self-start"
                  aria-expanded={card.toggle.expanded}
                  aria-controls={listId}
                  onClick={card.toggle.run}
                >
                  {card.toggle.label}
                </Button>
              )}
            </CardContent>
          )}
        </>
      )}
      {dialog?.kind === 'collect' && (
        <CollectDialog
          spaceId={spaceId}
          item={dialog.item}
          onClose={card.closeDialog}
          returnFocus={returnFocus}
        />
      )}
      {dialog?.kind === 'debt' && (
        <DebtDialog
          spaceId={spaceId}
          item={dialog.item}
          onClose={card.closeDialog}
          returnFocus={returnFocus}
        />
      )}
      {dialog?.kind === 'writeOff' && (
        <WriteOffDialog
          spaceId={spaceId}
          item={dialog.item}
          onClose={card.closeDialog}
          returnFocus={returnFocus}
        />
      )}
    </Card>
  );
}
