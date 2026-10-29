import { Button } from '@shared/design-system';
import type { SpaceNameView } from '@shared/lib';
import { useRef } from 'react';
import { useReportAction } from '../../hooks/report/useReportAction';
import { ReportDialog } from './ReportDialog';

/**
 * «الإبلاغ عن معلومة غير صحيحة» on a space's page (U10) and its dialog. A guest's press asks the page
 * for its sign-in (`signIn`), the report held until they come back; «عرض بلاغاتي» in the toast is the
 * page's `openMyReports`. Closed, the dialog gives the focus back to the button.
 */
export function ReportAction({
  slug,
  name,
  verified,
  signIn,
  openMyReports,
}: {
  slug: string;
  name: SpaceNameView;
  verified: boolean;
  signIn: (reason: 'report', cancel: () => void) => void;
  openMyReports: () => void;
}) {
  const action = useReportAction({ slug, signIn });
  const button = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button ref={button} variant="link" className="px-0" onClick={action.trigger.run}>
        {action.trigger.label}
      </Button>
      {action.open && (
        <ReportDialog
          slug={slug}
          name={name}
          verified={verified}
          openMyReports={openMyReports}
          onClose={action.close}
          returnFocus={() => button.current?.focus()}
        />
      )}
    </>
  );
}
