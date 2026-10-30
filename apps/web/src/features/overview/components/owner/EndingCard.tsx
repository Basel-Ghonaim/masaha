import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import { useId } from 'react';
import { Link } from 'react-router';
import type { OwnerOverviewView } from '../../hooks/owner/useOwnerOverview';

type EndingView = Extract<OwnerOverviewView, { state: 'ready' }>['ending'];

/**
 * «اشتراكات تنتهي هذا الأسبوع»: how many, «عرض الكل», and up to five: the customer's name, a link to
 * their file, what ends and when, and «تجديد», which opens the file (DI26). None: one line.
 */
export function EndingCard({ ending }: { ending: EndingView }) {
  const headingId = useId();

  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader>
        <CardTitle>
          <h2 id={headingId}>{ending.title}</h2>
        </CardTitle>
        <CardDescription>{ending.count}</CardDescription>
        <CardAction>
          <Button asChild variant="link" size="sm">
            <Link to={ending.viewAll.href}>{ending.viewAll.label}</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {ending.rows.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">{ending.none}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {ending.rows.map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <Link
                    to={row.href}
                    className="self-start text-label underline-offset-4 hover:underline"
                    dir="auto"
                  >
                    {row.name}
                  </Link>
                  {row.line !== null && (
                    <span className="text-caption text-muted-foreground">{row.line}</span>
                  )}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to={row.renew.href}>{row.renew.label}</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
