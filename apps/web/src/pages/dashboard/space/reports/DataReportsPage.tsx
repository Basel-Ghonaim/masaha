import type { DataReportField } from '@masaha/shared/data-reports';
import { SpaceReportsList } from '@features/data-reports';
import { NotFoundState, parseSpaceId } from '@shared/routing';
import { useCallback } from 'react';
import { useParams } from 'react-router';
import { FIELD_SECTIONS } from '../../fieldSections';
import { spacePagePath } from '../../navigation';
import { PageHeader } from '../../shell/PageHeader';

/**
 * «بلاغات البيانات», the owner's: `data-reports`' list of the space's reports and its decision sheet,
 * whose «تعديل الحقل» leads to the field's place (DI-33): the prices to Packages & prices, the other
 * groups to their section of the space profile, «أخرى» to the profile itself. The guard has checked
 * the space's id and the owner's role.
 */
export function DataReportsPage() {
  const spaceId = parseSpaceId(useParams().spaceId);

  return (
    <>
      <PageHeader />
      {spaceId === undefined ? (
        <NotFoundState />
      ) : (
        // Another space is another list: nothing chosen for one carries over to the next.
        <Reports key={spaceId} spaceId={spaceId} />
      )}
    </>
  );
}

function Reports({ spaceId }: { spaceId: number }) {
  const fieldLink = useCallback(
    (field: DataReportField) => {
      if (field === 'PRICES') return spacePagePath(spaceId, 'packages');
      const profile = spacePagePath(spaceId, 'profile');
      const section = FIELD_SECTIONS[field];
      return section === null ? profile : `${profile}#${section}`;
    },
    [spaceId],
  );

  return <SpaceReportsList spaceId={spaceId} fieldLink={fieldLink} />;
}
