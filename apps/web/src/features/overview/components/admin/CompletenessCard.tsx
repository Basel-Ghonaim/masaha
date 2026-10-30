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
import { useId } from 'react';
import { Link } from 'react-router';
import type { AdminOverviewView } from '../../hooks/admin/useAdminOverview';

type CompletenessView = Extract<AdminOverviewView, { state: 'ready' }>['completeness'];

/**
 * «اكتمال البيانات»: up to five of the spaces the admin edits that miss a group or hold a stale one —
 * the name, its states, a warning per group (A8), «تعديل» to its editor — and «عرض الكل».
 */
export function CompletenessCard({ completeness }: { completeness: CompletenessView }) {
  const headingId = useId();

  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader>
        <CardTitle>
          <h2 id={headingId}>{completeness.title}</h2>
        </CardTitle>
        <CardDescription>{completeness.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {completeness.rows.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">{completeness.none}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {completeness.rows.map((row) => (
              <li
                key={row.key}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between md:gap-4"
              >
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-label" lang={row.name.lang} dir={row.name.dir}>
                      {row.name.text}
                    </span>
                    {row.states.map((state) => (
                      <Badge key={state}>{state}</Badge>
                    ))}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    {row.groups.map((group) => (
                      <Badge key={group.key} variant="warning">
                        {group.text}
                      </Badge>
                    ))}
                  </span>
                </div>
                <Button asChild variant="outline" size="sm" className="self-start md:self-center">
                  <Link to={row.edit.href}>{row.edit.label}</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild variant="link" size="sm">
          <Link to={completeness.viewAll.href}>{completeness.viewAll.label}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
