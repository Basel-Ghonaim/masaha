import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import type { AnnouncementCardView } from '../../types/AnnouncementCardView';
import { ClosureLine } from './ClosureLine';

/**
 * One announcement, as a card: its type as its heading's badge (DI-15) and its period under it; its
 * text, in its own language (DI-27); a closure's line. No status badge: the tab says it.
 */
export function AnnouncementCard({ card }: { card: AnnouncementCardView }) {
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
    </Card>
  );
}
