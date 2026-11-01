import type { CheckInCheckOut } from '@masaha/shared/desk';
import type { PresentPerson } from '@masaha/shared/occupancy';
import {
  CheckOutAction,
  DeskLog,
  DeskSearch,
  PayDialog,
  type PayTarget,
  type SearchAfter,
  UncollectedCard,
  UnpricedCard,
  UsageOutDialog,
  useOpenCheckIns,
  useVisitDialog,
  useVisitTermsQuery,
  VisitDialog,
} from '@features/desk';
import {
  LiveStatusControl,
  matchesPerson,
  PresentList,
  PresentMatches,
  useStateNowQuery,
} from '@features/occupancy';
import { useSpaceShifts } from '@features/spaces';
import { useCopy } from '@shared/copy';
import {
  Alert,
  AlertDescription,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EllipsisIcon,
  LogInIcon,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useMediaQuery,
} from '@shared/design-system';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useSession } from '@shared/session';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { spaceCustomerPath } from '../../navigation';
import { PageActionBar } from '../../shell/PageActionBar';
import { PageHeader } from '../../shell/PageHeader';
import { SubscriptionSheetSlot } from '../SubscriptionSheetSlot';
import { useSheetOpener } from '../useSheetOpener';
import { SwitchStaffButton, SwitchStaffItem } from './SwitchStaffButton';

/**
 * «مكتب الاستقبال», the owner's and reception's: in the top bar, the live status visitors see and
 * its control, «تبديل الموظف» and «تسجيل زيارة» from 768 px; below it the control alone, «تبديل
 * الموظف» in a «⋯» menu and «تسجيل زيارة» in the bar at the foot (P1). Above the page, `desk`'s one
 * search, its first group `occupancy`'s people present who match (K1); «استلام دفعة» in the top bar
 * (its «⋯» on a phone), a card's «استلام» and a check-out toast's open one payment dialog. The page is the people
 * present, `occupancy`'s, with `desk`'s check-out in each row; «زبون جديد» in the top bar (its «⋯» on
 * a phone), the search's «زبون جديد باسم «X»» and a card's «اشتراك جديد» open the one subscription
 * sheet, with `packages`' offered packages; and beside it from `xl` (under it
 * before) `desk`'s uncollected visits and, for whoever may type a price, its unpriced ones; the visit's check-in is offered the space's shifts as `spaces`
 * reads them. Beside who is present, «السجل»: the day's log, the owner's chosen day or reception's
 * today (K8). What the role at the space allows beyond that (S5) is read from the session's link;
 * the server decides. The guard has checked the space's id and the role.
 */
/** The address's view of the desk: «السجل» when it names it, else «الآن». */
const VIEW_PARAM = 'view';
const NOW = 'now';
const LOG = 'log';

export function DeskPage() {
  const spaceId = parseSpaceId(useParams().spaceId);

  return spaceId === undefined ? (
    <>
      <PageHeader />
      <NotFoundState />
    </>
  ) : (
    // Another space is another desk: nothing typed for one carries over to the next.
    <Desk key={spaceId} spaceId={spaceId} />
  );
}

function Desk({ spaceId }: { spaceId: number }) {
  const copy = useCopy();
  const words = copy.desk;
  const wide = useMediaQuery('(min-width: 768px)');
  const terms = useVisitTermsQuery(spaceId);
  const shifts = useSpaceShifts('owner', spaceId);
  const now = useStateNowQuery(spaceId).data;
  // Full by the count, not by the status a manual override may set (G13.9).
  const full =
    now !== undefined && now.capacity !== null && now.present >= now.capacity
      ? { present: now.present, capacity: now.capacity }
      : null;
  const visit = useVisitDialog({ spaceId, shifts, full });
  const owner = useSession(
    (session) => session.user?.spaces.find((link) => link.spaceId === spaceId)?.role === 'OWNER',
  );
  const openVisit = () => {
    visit.setOpen(true);
  };
  // «زبون جديد», «اشتراك جديد»: one subscription sheet, opened from the page, the search or a card.
  const sheet = useSheetOpener();
  const subscribe = sheet.open;
  // The phone's «⋯», where the focus returns once a sheet opened from its item closes.
  const more = useRef<HTMLButtonElement | null>(null);
  // The search's cards' «⋯»: the owner's archive, the way to a customer's file, the sheet.
  const menu = useMemo(
    () => ({
      owner,
      fileLink: (customerId: number) => spaceCustomerPath(spaceId, customerId),
      subscribe,
    }),
    [owner, spaceId, subscribe],
  );
  // «استلام دفعة»: one payment dialog, opened from the page, a card or a check-out's toast.
  const [pay, setPay] = useState<PayTarget | null>(null);
  const [payOpening, setPayOpening] = useState(0);
  // A usage-based subscriber's check-out: its due, said in a dialog from the answer (D7.12).
  const [usageDue, setUsageDue] = useState<{ name: string; checkOut: CheckInCheckOut } | null>(
    null,
  );
  const usageOut = useCallback((name: string, checkOut: CheckInCheckOut) => {
    setUsageDue({ name, checkOut });
  }, []);
  const presentRegion = useRef<HTMLDivElement | null>(null);
  const receive = useCallback((target: PayTarget) => {
    setPay(target);
    setPayOpening((count) => count + 1);
  }, []);
  // The open check-ins name each subscriber's phone and usage; read again when the check-ins change.
  const people = now?.people;
  const checkInIds = useMemo(
    () => (people ?? []).flatMap((person) => (person.kind === 'CHECK_IN' ? [person.id] : [])),
    [people],
  );
  const { phones, usage, plan } = useOpenCheckIns(spaceId, checkInIds);
  // The search's first group: who is present now, whom a term matches.
  const present = useMemo(() => {
    const everyone = people ?? [];
    return {
      // A subscriber checked in, or a customer here on their visit (finding 160).
      customerIds: new Set(
        everyone.flatMap(({ customerId }) => (customerId === null ? [] : [customerId])),
      ),
      matches: (term: string) =>
        everyone.filter((person) => matchesPerson(person, term, phones)).length,
    };
  }, [people, phones]);
  // «الآن» | «السجل» (K8): the view, the log's day and its page in the address.
  const [search, setSearch] = useSearchParams();
  const view = search.get(VIEW_PARAM) === LOG ? LOG : NOW;
  const showView = (next: typeof NOW | typeof LOG) => {
    setSearch(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === LOG) params.set(VIEW_PARAM, LOG);
        else params.delete(VIEW_PARAM);
        return params;
      },
      { replace: true },
    );
  };
  const fileLink = useCallback(
    (customerId: number) => spaceCustomerPath(spaceId, customerId),
    [spaceId],
  );
  // A subscriber's plan names their badge; a customer's name leads to their file (G13.5, G13.6).
  const presentPeople = useMemo(() => ({ plan, fileLink }), [plan, fileLink]);
  // The rows' action, made once per terms: a new one would draw every row anew.
  const termsData = terms.data;
  const action = useCallback(
    (person: PresentPerson) => (
      <CheckOutAction
        spaceId={spaceId}
        person={person}
        terms={termsData}
        receive={receive}
        usageOut={usageOut}
      />
    ),
    [spaceId, termsData, receive, usageOut],
  );

  return (
    <>
      <PageHeader>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <LiveStatusControl spaceId={spaceId} />
          {wide ? (
            <>
              <SwitchStaffButton spaceId={spaceId} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  receive({});
                }}
              >
                {words.pay.title}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  subscribe({ mode: 'new' }, event.currentTarget);
                }}
              >
                {words.sheet.entry.new}
              </Button>
              <Button size="sm" onClick={openVisit}>
                <LogInIcon aria-hidden />
                {words.actions.checkIn}
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button ref={more} variant="ghost" size="icon" aria-label={words.actions.more}>
                  <EllipsisIcon aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => {
                    receive({});
                  }}
                >
                  {words.pay.title}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    subscribe({ mode: 'new' }, more.current);
                  }}
                >
                  {words.sheet.entry.new}
                </DropdownMenuItem>
                <SwitchStaffItem spaceId={spaceId} />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </PageHeader>
      <PageActionBar>
        <Button size="lg" className="w-full" onClick={openVisit}>
          <LogInIcon aria-hidden />
          {words.actions.checkIn}
        </Button>
      </PageActionBar>
      {terms.data === undefined && terms.isError && (
        <Alert variant="destructive">
          <AlertDescription>{words.terms.loadFailed}</AlertDescription>
        </Alert>
      )}
      <DeskSearch
        spaceId={spaceId}
        present={{
          customerIds: present.customerIds,
          matches: present.matches,
          group: (term, after: SearchAfter) => (
            <PresentMatches
              spaceId={spaceId}
              term={term}
              phones={phones}
              people={presentPeople}
              action={(person) => (
                <CheckOutAction
                  spaceId={spaceId}
                  person={person}
                  terms={termsData}
                  after={after}
                  receive={receive}
                  usageOut={usageOut}
                />
              )}
            />
          ),
        }}
        checkIn={(name, after) => {
          visit.setOpen(true, name, after);
        }}
        receive={receive}
        menu={menu}
      />
      {/* On a phone the uncollected come before who is here (K1); the grid places them from xl. */}
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-12 xl:items-start">
        <div className="flex flex-col gap-6 xl:order-last xl:col-span-4">
          <UncollectedCard spaceId={spaceId} abilities={{ writeOff: owner }} fileLink={fileLink} />
          <UnpricedCard spaceId={spaceId} mayTypePrice={terms.data?.mayTypePrice ?? false} />
        </div>
        <div ref={presentRegion} className="xl:col-span-8">
          <Tabs
            value={view}
            onValueChange={(next) => {
              showView(next === LOG ? LOG : NOW);
            }}
            className="flex flex-col gap-3"
          >
            <TabsList variant="line" aria-label={words.log.tabs.label}>
              <TabsTrigger value={NOW}>{words.log.tabs.now}</TabsTrigger>
              <TabsTrigger value={LOG}>{words.log.tabs.log}</TabsTrigger>
            </TabsList>
            <TabsContent value={NOW}>
              <PresentList spaceId={spaceId} action={action} usage={usage} people={presentPeople} />
            </TabsContent>
            <TabsContent value={LOG}>
              <DeskLog spaceId={spaceId} owner={owner} fileLink={fileLink} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <VisitDialog dialog={visit} />
      {pay !== null && (
        // Each opening is a new intent: a new dialog, a new key (S4).
        <PayDialog
          key={payOpening}
          spaceId={spaceId}
          target={pay}
          presentIds={present.customerIds}
          onClose={() => {
            setPay(null);
          }}
        />
      )}
      {usageDue !== null && (
        <UsageOutDialog
          spaceId={spaceId}
          name={usageDue.name}
          checkOut={usageDue.checkOut}
          onClose={() => {
            setUsageDue(null);
          }}
          // Their row has left: the focus goes to who is present's heading.
          returnFocus={() => {
            presentRegion.current?.querySelector<HTMLElement>('h2')?.focus();
          }}
        />
      )}
      {sheet.entry !== null && (
        <SubscriptionSheetSlot
          key={sheet.opening}
          spaceId={spaceId}
          entry={sheet.entry}
          returnFocus={sheet.returnFocus}
          onClose={sheet.close}
        />
      )}
    </>
  );
}
