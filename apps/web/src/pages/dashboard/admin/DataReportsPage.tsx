import type { DataReportField } from '@masaha/shared/data-reports';
import { AdminReportsList, type AdminSpaceFilterSlot } from '@features/data-reports';
import { AdminSpaceFilter } from '@features/space-links';
import { FIELD_SECTIONS } from '../fieldSections';
import { adminSpacePath } from '../navigation';
import { PageHeader } from '../shell/PageHeader';

// The list's two slots, made once, here, so the list keeps its rows from one render to the next.

/** The list's space filter: `space-links`' search of one space. */
const spaceFilter: AdminSpaceFilterSlot = (props) => <AdminSpaceFilter {...props} />;

/** A space's editor, and the section where a field group is edited in it (DI-33). */
const editorLink = (spaceId: number, field?: DataReportField) => {
  const section = field === undefined ? null : FIELD_SECTIONS[field];
  return section === null ? adminSpacePath(spaceId) : `${adminSpacePath(spaceId)}#${section}`;
};

/**
 * «بلاغات البيانات», the admin's: `data-reports`' list of every space's reports and its decision
 * sheet, with `space-links`' one-space search in its filters, each space and «تعديل الحقل» leading to
 * the space's editor. The guard has checked the admin's role.
 */
export function DataReportsPage() {
  return (
    <>
      <PageHeader />
      <AdminReportsList spaceFilter={spaceFilter} editorLink={editorLink} />
    </>
  );
}
