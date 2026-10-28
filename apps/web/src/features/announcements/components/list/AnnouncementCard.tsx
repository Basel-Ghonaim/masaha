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
import type { AnnouncementCardView } from '../../types/AnnouncementCardView';
import type { SheetEntry } from '../../types/SheetEntry';
import { ClosureLine } from './ClosureLine';

/**
 * One announcement, as a card: its type as its heading's badge (DI-15) and its period under it; its
 * text, in its own language (DI-27); a closure's line. No status badge: the tab says it. Its footer
 * holds «تعديل» on one running or upcoming (DI-16), which opens the sheet (`open`).
 */
export function AnnouncementCard({
  card,
  open,
}: {
  card: AnnouncementCardView;
  open: (entry: SheetEntry, trigger: HTMLElement) => void;
}) {
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
      </CardContent>
      {card.edit !== null && (
        <CardFooter className="flex-wrap">
          <Button
            variant="outline"
            onClick={(event) => {
              open({ mode: 'edit', announcement: card.announcement }, event.currentTarget);
            }}
          >
            {card.edit.label}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
