import type { AnnouncementState } from '@masaha/shared/announcements';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import { useAnnouncementActions } from '../../hooks/actions/useAnnouncementActions';
import type { AnnouncementCardView } from '../../types/AnnouncementCardView';
import type { OpenCardDialog } from '../../types/CardDialog';
import type { SheetEntry } from '../../types/SheetEntry';
import { AnnouncementMenu } from '../actions/AnnouncementMenu';
import { ClosureLine } from './ClosureLine';

/**
 * One announcement, as a card: its type as its heading's badge (DI-15) and its period under it; its
 * text, in its own language (DI-27); a closure's lines. No status badge: the tab says it. Its footer
 * holds its actions by its state (DI-16, DI-17): «تعديل» on one running or upcoming, which opens the
 * sheet (`open`); «إنهاء الآن» or «ابدأ الآن»; then the «⋯» with «حذف…» at the end. The delete's
 * dialog is the list's (`openDialog`). An extended
 * closure says why it has no delete. Each action is marked for the list's focus keeper
 * (`data-card-action`); the «⋯» says so once it leaves under the focus (`onGone`).
 */
export function AnnouncementCard({
  spaceId,
  card,
  open,
  openDialog,
  showTab,
  onGone,
}: {
  spaceId: number;
  card: AnnouncementCardView;
  open: (entry: SheetEntry, trigger: HTMLElement) => void;
  openDialog: OpenCardDialog;
  showTab: (state: AnnouncementState) => void;
  onGone: () => void;
}) {
  const actions = useAnnouncementActions(spaceId, card, { showTab });
  const step = actions.end ?? actions.start;
  const { remove } = actions.menu;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="flex">
            <Badge variant={card.type.tone}>{card.type.label}</Badge>
          </h2>
        </CardTitle>
        <CardDescription>{card.period}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-body whitespace-pre-line" lang={card.text.lang} dir={card.text.dir}>
          {card.text.text}
        </p>
        {card.closureLine !== null && <ClosureLine line={card.closureLine} />}
        {actions.lock !== null && <ClosureLine line={actions.lock} />}
      </CardContent>
      {(card.edit !== null || step !== null || remove !== null) && (
        <CardFooter className="flex-wrap">
          {card.edit !== null && (
            <Button
              variant="outline"
              data-card-action=""
              onClick={(event) => {
                open({ mode: 'edit', announcement: card.announcement }, event.currentTarget);
              }}
            >
              {card.edit.label}
            </Button>
          )}
          {step !== null && (
            <Button variant="outline" data-card-action="" loading={step.busy} onClick={step.run}>
              {step.label}
            </Button>
          )}
          {remove !== null && (
            <div className="ms-auto">
              <AnnouncementMenu
                card={card}
                menu={{ ...actions.menu, remove }}
                openDialog={openDialog}
                onGone={onGone}
              />
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
