import { Alert, AlertDescription, AlertTitle } from '@shared/design-system';
import type { PublicItemView } from '../../types/PublicItemView';

/**
 * A running closure as a space's public page shows it at its top (DI-59): a warning with the
 * closure's text and «إعلان من إدارة المساحة · {period}» (`notice`). The sheet's preview draws it
 * now; the space's page will (PR 4).
 */
export function ClosureNotice({ item, notice }: { item: PublicItemView; notice: string }) {
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
