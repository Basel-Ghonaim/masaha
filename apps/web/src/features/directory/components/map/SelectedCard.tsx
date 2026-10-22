import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  XIcon,
} from '@shared/design-system';
import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { DirectoryMapView } from '../../types/DirectoryMapView';
import { SpaceSummary } from './SpaceSummary';

/**
 * From 768 px, the chosen space as a card over the map's foot, a region named by the space: its
 * name, its area, its status and today's hours, «عرض التفاصيل» to its page, and «إغلاق», which
 * Escape within the card also does.
 */
export function SelectedCard({
  selected,
  href,
  areaName,
  onClose,
}: {
  selected: NonNullable<DirectoryMapView['selected']>;
  href: string;
  areaName: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const { card } = selected;

  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      className="pointer-events-auto w-80 shadow-overlay"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        onClose();
      }}
    >
      <CardHeader>
        <CardTitle>
          <h2 id={titleId}>
            <span lang={card.name.lang} dir={card.name.dir}>
              {card.name.text}
            </span>
          </h2>
        </CardTitle>
        <CardDescription>{areaName}</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon" aria-label={selected.closeLabel} onClick={onClose}>
            <XIcon aria-hidden />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <SpaceSummary card={card} />
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link to={href}>{selected.details}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
