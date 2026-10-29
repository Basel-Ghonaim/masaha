import type { DataReportDecision } from '@masaha/shared/data-reports';
import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';

/**
 * Says a report was decided, and where it went (DI-41): «عُلّم «تم التصحيح»» or «عُلّم «لم يُعتمد»»,
 * «في «تمت المراجعة»» with «عرض», which shows the reports decided, and «أُرسل الردّ لصاحب البلاغ.»
 * when a reply was written. Worded when it lands, in the language the interface speaks then.
 */
export function toastDecided(
  status: DataReportDecision,
  { replied, show }: { replied: boolean; show: () => void },
) {
  const words = currentCopy().dataReports.toast;
  const lines = [words.inDecided, ...(replied ? [words.replied] : [])];
  toast.success(status === 'RESOLVED' ? words.resolved : words.dismissed, {
    description: lines.map((line) => (
      <span key={line} className="block">
        {line}
      </span>
    )),
    action: { label: words.show, onClick: show },
  });
}
