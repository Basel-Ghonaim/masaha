import { useCopy } from '@shared/copy';
import { useSession } from '@shared/session';
import { useState } from 'react';
import { dropReport, holdReport, takeReport, useHeldReport } from '../intent/reportIntent';

/**
 * «الإبلاغ عن معلومة غير صحيحة» (U10): a signed-in user's press opens the dialog; a guest's holds the
 * report in memory and asks the page to show the sign-in (S14, C4), with what lets it go should the
 * guest close it without going on. Back on the page with a session and the report held for this
 * space, the dialog is open (DI-61) until it closes, which lets the held report go; nothing in the
 * address can open it. While the session is still being restored, a press waits for it.
 */
export function useReportAction({
  slug,
  signIn,
}: {
  slug: string;
  /** Shows the page's sign-in for a report; `cancel` lets the held report go. */
  signIn: (reason: 'report', cancel: () => void) => void;
}) {
  const label = useCopy().dataReports.report.trigger;
  const session = useSession((state) => state.status);
  const signedIn = session === 'authenticated';
  const [opened, setOpened] = useState(false);
  const held = useHeldReport();
  // The report a guest held here, now signed in: the dialog opens by it.
  const resumed = signedIn && held === slug;

  return {
    trigger: {
      label,
      run: () => {
        if (signedIn) {
          setOpened(true);
          return;
        }
        if (session === 'restoring') return;
        holdReport(slug);
        signIn('report', dropReport);
      },
    },
    open: opened || resumed,
    close: () => {
      takeReport(slug);
      setOpened(false);
    },
  };
}
