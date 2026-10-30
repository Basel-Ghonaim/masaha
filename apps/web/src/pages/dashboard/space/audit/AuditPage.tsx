import type { AuditTarget } from '@masaha/shared/audit';
import { AuditLog } from '@features/audit';
import { useMySpacesQuery } from '@features/space-links';
import { spaceNameOf } from '@shared/lib';
import { useLanguage } from '@shared/localisation';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useCallback } from 'react';
import { useParams } from 'react-router';
import { spaceCustomerPath, spacePagePath } from '../../navigation';
import { PageHeader } from '../../shell/PageHeader';

/**
 * «سجل التدقيق», the owner's (O13, finding 14): `audit`'s log of the space, named by the switcher's
 * read of the user's spaces, each target leading to its page — a customer to the file, the space to
 * its profile, a package to Packages & prices, an announcement to the announcements, a payment to
 * the ledger, a report to the reports with it open. The guard has checked the space's id and the
 * owner's role.
 */
export function AuditPage() {
  const spaceId = parseSpaceId(useParams().spaceId);

  return (
    <>
      <PageHeader />
      {spaceId === undefined ? (
        <NotFoundState />
      ) : (
        // Another space is another log: nothing chosen for one carries over to the next.
        <SpaceAudit key={spaceId} spaceId={spaceId} />
      )}
    </>
  );
}

function SpaceAudit({ spaceId }: { spaceId: number }) {
  const english = useLanguage() === 'en';
  const space = useMySpacesQuery().data?.find((each) => each.spaceId === spaceId);
  const linkOf = useCallback(
    ({ type, id }: AuditTarget) => {
      if (id === null) return null;
      switch (type) {
        case 'customer':
          return spaceCustomerPath(spaceId, id);
        case 'space':
          return spacePagePath(spaceId, 'profile');
        case 'package':
          return spacePagePath(spaceId, 'packages');
        case 'announcement':
          return spacePagePath(spaceId, 'announcements');
        case 'payment':
          return spacePagePath(spaceId, 'payments');
        case 'dataReport':
          return `${spacePagePath(spaceId, 'dataReports')}?open=${String(id)}`;
        default:
          return null;
      }
    },
    [spaceId],
  );

  return (
    <AuditLog
      scope="space"
      spaceId={spaceId}
      spaceName={space === undefined ? undefined : spaceNameOf(space, english)}
      linkOf={linkOf}
    />
  );
}
