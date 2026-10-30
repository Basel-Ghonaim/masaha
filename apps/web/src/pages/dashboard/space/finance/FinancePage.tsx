import { FinanceExport, FinanceScreen, type FinanceLinks } from '@features/finance';
import { useMySpacesQuery } from '@features/space-links';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useParams } from 'react-router';
import { spaceCustomerPath, spacePagePath } from '../../navigation';
import { PageHeader } from '../../shell/PageHeader';

/** Where finance leads (D5.4): a customer's file, the desk's uncollected visits, the ledger's range. */
function linksOf(spaceId: number): FinanceLinks {
  return {
    customer: (customerId) => spaceCustomerPath(spaceId, customerId),
    uncollected: `${spacePagePath(spaceId, 'desk')}#uncollected`,
    // The ledger's own address names (EC16, `ledgerQueryOf`).
    ledger: ({ from, to }) => `${spacePagePath(spaceId, 'payments')}?from=${from}&to=${to}`,
  };
}

/**
 * «المالية والتقارير», the owner's alone (screen 19): in the top bar, the export of the tab shown
 * (in «⋯» on a phone, P1); then `finance`'s tabs and month, every link this page's, and the space's
 * name for the reminder as `space-links` lists it, by its Arabic name when it has one. Reception is
 * refused by the guard, which has checked the space's id and the role.
 */
export function FinancePage() {
  const spaceId = parseSpaceId(useParams().spaceId);
  const space = useMySpacesQuery().data?.find((one) => one.spaceId === spaceId);
  const spaceName = space === undefined ? '' : (space.nameAr ?? space.nameEn);

  if (spaceId === undefined) {
    return (
      <>
        <PageHeader />
        <NotFoundState />
      </>
    );
  }
  return (
    <>
      <PageHeader>
        <div className="ms-auto flex items-center gap-2">
          <FinanceExport spaceId={spaceId} />
        </div>
      </PageHeader>
      {/* Another space is another page: nothing shown for one carries over to the next. */}
      <FinanceScreen
        key={spaceId}
        spaceId={spaceId}
        spaceName={spaceName}
        links={linksOf(spaceId)}
      />
    </>
  );
}
