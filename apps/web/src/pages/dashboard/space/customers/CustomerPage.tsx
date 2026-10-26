import { CustomerFile, useFileTitle } from '@features/desk';
import { useCopy } from '@shared/copy';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@shared/design-system';
import { NotFoundState, parseSpaceId, useRecordTitle } from '@shared/routing';
import { useSession } from '@shared/session';
import { Link, useParams } from 'react-router';
import { spacePagePath } from '../../navigation';
import { PageHeader } from '../../shell/PageHeader';
import { SubscriptionSheetSlot } from '../SubscriptionSheetSlot';
import { useSheetOpener } from '../useSheetOpener';

/** A customer's id from the address: a whole number above zero, else none. */
function parseCustomerId(value: string | undefined): number | undefined {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= 2_147_483_647 ? id : undefined;
}

/**
 * «ملف الزبون», the owner's and reception's: titled by the customer's name once their file has
 * loaded, under a trail back to «الزبائن», then `desk`'s file, whose archive and restore are the
 * owner's, as the session's link at the space says (S5); the header's «اشتراك جديد» opens `desk`'s
 * subscription sheet. An id that names no one shows the 404.
 * The guard has checked the space's id and the role.
 */
export function CustomerPage() {
  const params = useParams();
  const spaceId = parseSpaceId(params.spaceId);
  const customerId = parseCustomerId(params.customerId);

  return spaceId === undefined || customerId === undefined ? (
    <>
      <PageHeader />
      <NotFoundState />
    </>
  ) : (
    // Another customer is another file: nothing opened for one carries over to the next.
    <Customer
      key={`${String(spaceId)}-${String(customerId)}`}
      spaceId={spaceId}
      customerId={customerId}
    />
  );
}

function Customer({ spaceId, customerId }: { spaceId: number; customerId: number }) {
  const copy = useCopy();
  const title = useFileTitle(spaceId, customerId);
  useRecordTitle(title);
  const owner = useSession(
    (session) => session.user?.spaces.find((link) => link.spaceId === spaceId)?.role === 'OWNER',
  );
  const sheet = useSheetOpener();

  return (
    <>
      <PageHeader />
      <div className="flex flex-col gap-4">
        <Breadcrumb label={copy.desk.file.breadcrumb}>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={spacePagePath(spaceId, 'customers')}>
                  {copy.dashboard.pages.customers}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage dir="auto">{title?.text ?? copy.desk.file.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <CustomerFile
          spaceId={spaceId}
          customerId={customerId}
          owner={owner}
          subscribe={sheet.open}
        />
      </div>
      {sheet.entry !== null && (
        <SubscriptionSheetSlot
          key={sheet.opening}
          spaceId={spaceId}
          entry={sheet.entry}
          onClose={sheet.close}
        />
      )}
    </>
  );
}
