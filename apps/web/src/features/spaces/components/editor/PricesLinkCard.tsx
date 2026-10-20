import {
  ArrowEndIcon,
  Badge,
  Button,
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import { Link } from 'react-router';
import type { usePricesLink } from '../../hooks/editor/usePricesLink';

type PricesLinkView = NonNullable<ReturnType<typeof usePricesLink>>;

/**
 * «الأسعار» on an owner's editor: no fields, but where they are edited and confirmed, their date or
 * that they were never added, «قديمة» when stale, and the way there (`href`). Its id is the
 * navigation's anchor, as a section's is.
 */
export function PricesLinkCard({ view, href }: { view: PricesLinkView; href: string }) {
  return (
    <Card id="prices" className="scroll-mt-28 lg:scroll-mt-20">
      <CardHeader>
        <CardTitle>
          <h2>{view.title}</h2>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{view.description}</span>
          <span aria-hidden>·</span>
          <span>{view.date}</span>
          {view.stale && <Badge variant="warning">{view.stale}</Badge>}
        </CardDescription>
        <CardAction>
          <Button asChild variant="outline" size="sm">
            <Link to={href}>
              {view.action.label}
              <ArrowEndIcon aria-hidden />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
    </Card>
  );
}
