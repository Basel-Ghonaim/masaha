import { MyReportsList } from '@features/data-reports';
import { useCopy } from '@shared/copy';
import { publicSpacePath } from '@shared/routing';
import { SITE_PATHS } from '../navigation';

/**
 * «بلاغاتي» (screen 11): its heading and what it lists, then the user's reports, each listed space
 * linked to its page, «تصفّح المساحات» leading to the directory.
 */
export function MyReportsPage() {
  const words = useCopy().dataReports.mine;

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-heading-1">{words.title}</h1>
        <p className="text-body text-muted-foreground">{words.description}</p>
      </div>
      <MyReportsList spaceLink={publicSpacePath} browseLink={SITE_PATHS.spaces} />
    </>
  );
}
