import type { PresentPerson } from '@masaha/shared/occupancy';
import {
  CheckOutAction,
  DeskSearch,
  PayDialog,
  type PayTarget,
  type SearchAfter,
  UncollectedCard,
  UnpricedCard,
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
  useMediaQuery,
} from '@shared/design-system';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useSession } from '@shared/session';
import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { spaceCustomerPath } from '../../navigation';
import { PageActionBar } from '../../shell/PageActionBar';
import { PageHeader } from '../../shell/PageHeader';
import { SwitchStaffButton, SwitchStaffItem } from './SwitchStaffButton';

/**
 * «مكتب الاستقبال», the owner's and reception's: in the top bar, the live status visitors see and
 * its control, «تبديل الموظف» and «تسجيل زيارة» from 768 px; below it the control alone, «تبديل
 * الموظف» in a «⋯» menu and «تسجيل زيارة» in the bar at the foot (P1). Above the page, `desk`'s one
 * search, its first group `occupancy`'s people present who match (K1); «استلام دفعة» in the top bar
 * (its «⋯» on a phone), a card's «استلام» and a check-out toast's open one payment dialog. The page is the people
 * present, `occupancy`'s, with `desk`'s check-out in each row, and beside it from `xl` (under it
 * before) `desk`'s uncollected visits and, for whoever may type a price, its unpriced ones; the visit's check-in is offered the space's shifts as `spaces`
 * reads them. What the role at the space allows beyond that (S5) is read from the session's link;
 * the server decides. The guard has checked the space's id and the role.
 */
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
  const full = now?.status === 'FULL';
  const visit = useVisitDialog({ spaceId, shifts, full });
  const owner = useSession(
    (session) => session.user?.spaces.find((link) => link.spaceId === spaceId)?.role === 'OWNER',
  );
  const openVisit = () => {
    visit.setOpen(true);
  };
  // The search's cards' «⋯»: the owner's archive, and the way to a customer's file.
  const menu = useMemo(
    () => ({
      owner,
      fileLink: (customerId: number) => spaceCustomerPath(spaceId, customerId),
    }),
    [owner, spaceId],
  );
  // «استلام دفعة»: one payment dialog, opened from the page, a card or a check-out's toast.
  const [pay, setPay] = useState<PayTarget | null>(null);
  const [payOpening, setPayOpening] = useState(0);
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
  const { phones, usage } = useOpenCheckIns(spaceId, checkInIds);
  // The search's first group: who is present now, whom a term matches.
  const present = useMemo(() => {
    const everyone = people ?? [];
    return {
      customerIds: new Set(
        everyone.flatMap((person) => (person.kind === 'CHECK_IN' ? [person.customerId] : [])),
      ),
      matches: (term: string) =>
        everyone.filter((person) => matchesPerson(person, term, phones)).length,
    };
  }, [people, phones]);
  // The rows' action, made once per terms: a new one would draw every row anew.
  const termsData = terms.data;
  const action = useCallback(
    (person: PresentPerson) => (
      <CheckOutAction spaceId={spaceId} person={person} terms={termsData} receive={receive} />
    ),
    [spaceId, termsData, receive],
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
              <Button size="sm" onClick={openVisit}>
                {words.actions.checkIn}
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={words.actions.more}>
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
                <SwitchStaffItem spaceId={spaceId} />
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </PageHeader>
      <PageActionBar>
        <Button size="lg" className="w-full" onClick={openVisit}>
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
              action={(person) => (
                <CheckOutAction
                  spaceId={spaceId}
                  person={person}
                  terms={termsData}
                  after={after}
                  receive={receive}
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
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-12 xl:items-start">
        <div className="xl:col-span-8">
          <PresentList spaceId={spaceId} action={action} usage={usage} />
        </div>
        <div className="flex flex-col gap-6 xl:col-span-4">
          <UncollectedCard spaceId={spaceId} abilities={{ writeOff: owner }} />
          <UnpricedCard spaceId={spaceId} mayTypePrice={terms.data?.mayTypePrice ?? false} />
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
    </>
  );
}
