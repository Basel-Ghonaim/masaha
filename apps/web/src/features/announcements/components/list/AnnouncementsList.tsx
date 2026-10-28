import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  EmptyState,
  MegaphoneIcon,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@shared/design-system';
import { ListPagination } from '@shared/lists';
import { useRef, useState } from 'react';
import {
  useAnnouncementsList,
  type AnnouncementsListView,
} from '../../hooks/list/useAnnouncementsList';
import { useCardFocus } from '../../hooks/list/useCardFocus';
import type { CardDialog, OpenCardDialog } from '../../types/CardDialog';
import type { SheetEntry } from '../../types/SheetEntry';
import { DeleteDialog } from '../actions/DeleteDialog';
import { AnnouncementSheet } from '../sheet/AnnouncementSheet';
import { AnnouncementCard } from './AnnouncementCard';

type Open = (entry: SheetEntry, trigger: HTMLElement) => void;

/** «إعلان جديد», which opens the sheet for a new announcement. */
function NewButton({ label, open, className }: { label: string; open: Open; className?: string }) {
  return (
    <Button
      className={className}
      onClick={(event) => {
        open({ mode: 'new' }, event.currentTarget);
      }}
    >
      {label}
    </Button>
  );
}

/** What stands in for the cards: the skeletons, the failure with its retry, or the tab's empty state. */
function ListState({ list, open }: { list: AnnouncementsListView; open: Open }) {
  if (list.state === 'loading') {
    return (
      <>
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </>
    );
  }
  if (list.state === 'failed') {
    const { failure } = list;
    return (
      <Alert variant="destructive">
        <AlertTitle>{failure.title}</AlertTitle>
        <AlertDescription>
          {failure.message}
          {failure.reference !== undefined && <span className="block">{failure.reference}</span>}
        </AlertDescription>
        <AlertAction>
          <Button variant="outline" disabled={failure.blocked} onClick={failure.retry}>
            {failure.retryLabel}
          </Button>
        </AlertAction>
      </Alert>
    );
  }
  return (
    <EmptyState
      icon={<MegaphoneIcon aria-hidden />}
      title={list.empty.title}
      description={list.empty.text}
    >
      <NewButton label={list.create.label} open={open} />
    </EmptyState>
  );
}

/**
 * «الإعلانات» (screen 18), the owner's and reception's: the tabs «نشطة · مجدولة · منتهية», each with
 * its count as a badge (a skeleton while the counts load); then the tab's announcements, a card each
 * (DI-15), the list marked busy while another page or tab loads; three skeleton cards while it loads
 * (DI-23), the failure with its retry, the tab's empty state; the pages past one page only (DI-26).
 * «إعلان جديد» at the end of the tabs' row and a card's «تعديل» open the sheet, mounted anew for each
 * opening (its key is that opening's, S4); closed, the focus goes back to the control that opened it.
 * A card's delete dialog is held here too, so that they stay open whatever the list's
 * refetch makes of the card — a 409 or a 404 stays in its dialog until «رجوع»; closed, the focus goes
 * back to the control that opened it, else to the card's first action, else on as below.
 * When the card whose action holds the focus leaves its tab — ended, started or deleted — the next
 * card's first action takes it, else the tab shown (DI-24).
 */
export function AnnouncementsList({ spaceId, owner }: { spaceId: number; owner: boolean }) {
  const list = useAnnouncementsList(spaceId, { owner });
  const [sheet, setSheet] = useState<{ entry: SheetEntry; opening: number } | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const open: Open = (entry, trigger) => {
    opener.current = trigger;
    setSheet((before) => ({ entry, opening: (before?.opening ?? 0) + 1 }));
  };
  const { listRef, tabsRef, leave, settle } = useCardFocus(list.cards.map((card) => card.key));
  const [dialog, setDialog] = useState<(CardDialog & { key: string; opening: number }) | null>(
    null,
  );
  const dialogOpener = useRef<HTMLElement | null>(null);
  const openDialog: OpenCardDialog = (entry, key, trigger) => {
    dialogOpener.current = trigger;
    setDialog((before) => ({ ...entry, key, opening: (before?.opening ?? 0) + 1 }));
  };
  const returnDialogFocus = (key: string) => {
    const trigger = dialogOpener.current;
    if (trigger?.isConnected === true) trigger.focus();
    else settle(key);
  };

  return (
    <Tabs value={list.tab} onValueChange={list.choose} className="max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <TabsList ref={tabsRef} aria-label={list.tabsLabel}>
          {list.tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}{' '}
              {tab.count === null ? (
                <Skeleton className="h-5 w-6" />
              ) : (
                <Badge>{String(tab.count)}</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        <NewButton label={list.create.label} open={open} className="ms-auto" />
      </div>
      <TabsContent value={list.tab} className="flex flex-col gap-4">
        {list.refreshFailure !== null && (
          <p className="text-body-sm text-muted-foreground">{list.refreshFailure}</p>
        )}
        <section
          ref={listRef}
          aria-label={list.listLabel}
          aria-busy={list.busy || list.state === 'loading' || undefined}
          className="flex flex-col gap-4"
        >
          {list.state === 'ready' ? (
            <ul className="flex flex-col gap-4">
              {list.cards.map((card) => (
                <li key={card.key} data-card-key={card.key}>
                  <AnnouncementCard
                    spaceId={spaceId}
                    card={card}
                    open={open}
                    openDialog={openDialog}
                    showTab={list.choose}
                    onGone={() => {
                      leave(card.key);
                    }}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <ListState list={list} open={open} />
          )}
        </section>
        {list.pagination !== null && <ListPagination pagination={list.pagination} />}
      </TabsContent>
      {dialog?.kind === 'delete' && (
        <DeleteDialog
          key={dialog.opening}
          spaceId={spaceId}
          card={dialog.card}
          onClose={() => {
            setDialog(null);
          }}
          returnFocus={() => {
            returnDialogFocus(dialog.key);
          }}
        />
      )}
      {sheet !== null && (
        <AnnouncementSheet
          key={sheet.opening}
          spaceId={spaceId}
          entry={sheet.entry}
          showTab={list.choose}
          returnFocus={() => opener.current}
          onClose={() => {
            setSheet(null);
          }}
        />
      )}
    </Tabs>
  );
}
