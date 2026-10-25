import type { PresentPerson } from '@masaha/shared/occupancy';
import { CheckOutAction, useVisitDialog, useVisitTermsQuery, VisitDialog } from '@features/desk';
import { LiveStatusControl, PresentList, useStateNowQuery } from '@features/occupancy';
import { useSpaceShifts } from '@features/spaces';
import { useCopy } from '@shared/copy';
import {
  Alert,
  AlertDescription,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  EllipsisIcon,
  useMediaQuery,
} from '@shared/design-system';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useCallback } from 'react';
import { useParams } from 'react-router';
import { PageActionBar } from '../../shell/PageActionBar';
import { PageHeader } from '../../shell/PageHeader';
import { SwitchStaffButton, SwitchStaffItem } from './SwitchStaffButton';

/**
 * «مكتب الاستقبال», the owner's and reception's: in the top bar, the live status visitors see and
 * its control, «تبديل الموظف» and «تسجيل زيارة» from 768 px; below it the control alone, «تبديل
 * الموظف» in a «⋯» menu and «تسجيل زيارة» in the bar at the foot (P1). The page is the people
 * present, `occupancy`'s, with `desk`'s check-out in each row; the visit's check-in is offered the
 * space's shifts as `spaces` reads them. The guard has checked the space's id and the role.
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
  const full = useStateNowQuery(spaceId).data?.status === 'FULL';
  const visit = useVisitDialog({ spaceId, shifts, full });
  const openVisit = () => {
    visit.setOpen(true);
  };
  // The rows' action, made once per terms: a new one would draw every row anew.
  const termsData = terms.data;
  const action = useCallback(
    (person: PresentPerson) => (
      <CheckOutAction spaceId={spaceId} person={person} terms={termsData} />
    ),
    [spaceId, termsData],
  );

  return (
    <>
      <PageHeader>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <LiveStatusControl spaceId={spaceId} />
          {wide ? (
            <>
              <SwitchStaffButton spaceId={spaceId} />
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
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-12 xl:items-start">
        <div className="xl:col-span-8">
          <PresentList spaceId={spaceId} action={action} />
        </div>
      </div>
      <VisitDialog dialog={visit} />
    </>
  );
}
