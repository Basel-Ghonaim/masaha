import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import { NotFoundState } from '@shared/routing';
import { Link } from 'react-router';
import { useSpacePricesCard } from '../../hooks/prices/useSpacePricesCard';
import { EditorFailure } from '../editor/EditorFailure';
import { EditorLoading } from '../editor/EditorLoading';
import { PricesView } from './PricesView';

/**
 * An owner's «الأسعار المعلنة» on Packages & prices, read-only (R1): their table, their date and
 * stale badge, and «تعديل الأسعار في ملف المساحة», which opens the profile's prices Sheet
 * (`editLink`), the one place they are edited. Its own loading, failure and not-found states.
 */
export function SpacePricesCard({ spaceId, editLink }: { spaceId: number; editLink: string }) {
  const card = useSpacePricesCard(spaceId, editLink);

  if (card.state === 'loading') return <EditorLoading label={card.label} />;
  if (card.state === 'notFound') return <NotFoundState />;
  if (card.state === 'failed') return <EditorFailure message={card.message} retry={card.retry} />;

  return (
    <Card id="prices" aria-labelledby="published-prices-title">
      <CardHeader>
        <CardTitle>
          <h2 id="published-prices-title">{card.title}</h2>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{card.description}</span>
          {card.date && <span>{card.date}</span>}
          {card.stale && <Badge variant="warning">{card.stale}</Badge>}
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" asChild>
            <Link to={card.edit.href}>{card.edit.label}</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {card.empty === null ? (
          <PricesView table={card.table} />
        ) : (
          <p className="text-body-sm text-muted-foreground">{card.empty}</p>
        )}
      </CardContent>
    </Card>
  );
}
