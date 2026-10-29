import { Alert, AlertDescription, AlertTitle } from '@shared/design-system';
import { usePublicAnnouncements } from '../../hooks/public/usePublicAnnouncements';
import type { PublicAnnouncement } from '../../types/PublicAnnouncement';
import type { PublicItemView } from '../../types/PublicItemView';

/**
 * A running closure as a space's public page shows it at its top (DI-59): a warning with the
 * closure's text and «إعلان من إدارة المساحة · {period}» (`notice`). The sheet's preview draws it too.
 */
export function ClosureAlert({ item, notice }: { item: PublicItemView; notice: string }) {
  return (
    <Alert variant="warning">
      <AlertTitle
        className="break-words whitespace-pre-line"
        lang={item.text.lang}
        dir={item.text.dir}
      >
        {item.text.text}
      </AlertTitle>
      <AlertDescription>{notice}</AlertDescription>
    </Alert>
  );
}

/**
 * The running closure among a space's public announcements, as the warning at the top of its page
 * (U8: «the closure Alert stays at the top»); nothing without one.
 */
export function ClosureNotice({ items }: { items: readonly PublicAnnouncement[] }) {
  const { notice } = usePublicAnnouncements(items);
  return notice === null ? null : <ClosureAlert item={notice.item} notice={notice.notice} />;
}
