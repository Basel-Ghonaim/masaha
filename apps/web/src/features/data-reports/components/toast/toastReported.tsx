import { currentCopy } from '@shared/copy';
import { toast } from '@shared/design-system';

/**
 * Says where a report's reply will land (DI-47): «أرسلنا بلاغك إلى إدارة المساحة…» for a verified
 * space, «…إلى فريقنا…» otherwise; or, for a repeat, that one is already open (DI-48). Each with
 * «عرض بلاغاتي». Worded when it lands, in the language the interface speaks then.
 */
export function toastReported({
  repeated,
  verified,
  openMine,
}: {
  repeated: boolean;
  verified: boolean;
  openMine: () => void;
}) {
  const words = currentCopy().dataReports.report;
  const line = repeated ? words.repeated : verified ? words.sentSpace : words.sentTeam;
  const action = { label: words.showMine, onClick: openMine };
  if (repeated) toast.info(line, { action });
  else toast.success(line, { action });
}
