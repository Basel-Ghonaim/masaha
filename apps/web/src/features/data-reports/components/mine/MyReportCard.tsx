import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from '@shared/design-system';
import { Link } from 'react-router';
import type { MyReportCardView } from '../../types/MyReportCardView';

/**
 * One of the user's reports: its space as the card's heading (a link while it is listed, its name as
 * muted text once it left, with C7's line), its field and day, its status; the message in its own
 * direction, folded to two lines while long with «عرض المزيد» (`aria-expanded`, `aria-controls`); and
 * the reply, labelled by who replied, in its own direction.
 */
export function MyReportCard({ card }: { card: MyReportCardView }) {
  const { space, message, reply } = card;
  const name = (
    <span lang={space.name.lang} dir={space.name.dir}>
      {space.name.text}
    </span>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-heading-3">
            {space.link === null ? (
              <span className="text-muted-foreground">{name}</span>
            ) : (
              <Link to={space.link} className="underline-offset-4 hover:underline">
                {name}
              </Link>
            )}
          </h2>
        </CardTitle>
        <CardDescription>
          <span className="block">{card.meta}</span>
          {space.gone !== null && <span className="block">{space.gone}</span>}
        </CardDescription>
        <CardAction>
          <Badge variant={card.status.tone}>{card.status.label}</Badge>
        </CardAction>
      </CardHeader>
      {(message !== null || reply !== null) && (
        <CardContent>
          {message !== null && (
            <div className="flex flex-col items-start gap-1">
              <p
                id={message.id}
                dir="auto"
                className={cn(
                  'text-body-sm break-words',
                  message.toggle !== null && !message.toggle.expanded && 'line-clamp-2',
                )}
              >
                {message.text}
              </p>
              {message.toggle !== null && (
                <Button
                  variant="link"
                  size="sm"
                  className="px-0"
                  aria-expanded={message.toggle.expanded}
                  aria-controls={message.id}
                  onClick={message.toggle.run}
                >
                  {message.toggle.label}
                </Button>
              )}
            </div>
          )}
          {reply !== null && (
            <div className="flex flex-col gap-1 rounded-md bg-muted px-3 py-2">
              <p className="text-caption text-muted-foreground">{reply.label}</p>
              <p dir="auto" className="text-body-sm break-words">
                {reply.text}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
