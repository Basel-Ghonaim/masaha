import type { AnnouncementCardView } from '../../types/AnnouncementCardView';
import type { OpenCardDialog } from '../../types/CardDialog';
import { ExtensionAction } from '../extension/ExtensionAction';

/**
 * A closure's lines on its card (DI-28): what its subscriptions' extension is now — extended, how
 * many, by how many days, by whom and when; the owner's line on one not started; reception's on one
 * started — and the owner's «تمديد الاشتراكات» on a started closure not extended (O11).
 */
export function ClosureLine({
  card,
  openDialog,
}: {
  card: AnnouncementCardView;
  openDialog: OpenCardDialog;
}) {
  if (card.closureLine === null && card.extension === null) return null;
  return (
    <div className="flex flex-col gap-2">
      {card.closureLine !== null && (
        <p className="text-caption text-muted-foreground">{card.closureLine}</p>
      )}
      {card.extension !== null && (
        <ExtensionAction
          closure={card.announcement}
          cardKey={card.key}
          label={card.extension.label}
          openDialog={openDialog}
        />
      )}
    </div>
  );
}
