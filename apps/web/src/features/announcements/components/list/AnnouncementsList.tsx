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
import {
  useAnnouncementsList,
  type AnnouncementsListView,
} from '../../hooks/list/useAnnouncementsList';
import { AnnouncementCard } from './AnnouncementCard';

/** What stands in for the cards: the skeletons, the failure with its retry, or the tab's empty state. */
function ListState({ list }: { list: AnnouncementsListView }) {
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
    />
  );
}

/**
 * «الإعلانات» (screen 18), the owner's and reception's: the tabs «نشطة · مجدولة · منتهية», each with
 * its count as a badge (a skeleton while the counts load); then the tab's announcements, a card each
 * (DI-15), the list marked busy while another page or tab loads; three skeleton cards while it loads
 * (DI-23), the failure with its retry, the tab's empty state; the pages past one page only (DI-26).
 */
export function AnnouncementsList({ spaceId, owner }: { spaceId: number; owner: boolean }) {
  const list = useAnnouncementsList(spaceId, { owner });

  return (
    <Tabs value={list.tab} onValueChange={list.choose} className="max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <TabsList aria-label={list.tabsLabel}>
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
      </div>
      <TabsContent value={list.tab} className="flex flex-col gap-4">
        {list.refreshFailure !== null && (
          <p className="text-body-sm text-muted-foreground">{list.refreshFailure}</p>
        )}
        <section
          aria-label={list.listLabel}
          aria-busy={list.busy || list.state === 'loading' || undefined}
          className="flex flex-col gap-4"
        >
          {list.state === 'ready' ? (
            <ul className="flex flex-col gap-4">
              {list.cards.map((card) => (
                <li key={card.key}>
                  <AnnouncementCard card={card} />
                </li>
              ))}
            </ul>
          ) : (
            <ListState list={list} />
          )}
        </section>
        {list.pagination !== null && <ListPagination pagination={list.pagination} />}
      </TabsContent>
    </Tabs>
  );
}
