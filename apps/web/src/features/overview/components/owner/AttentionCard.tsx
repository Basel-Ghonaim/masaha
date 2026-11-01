import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CircleCheckIcon,
} from '@shared/design-system';
import { useId } from 'react';
import { Link } from 'react-router';
import type { AttentionRowView } from '../../types/AttentionRowView';

/**
 * «يحتاج انتباهك»: one row per thing waiting, each its title (a fact group's with its badge), a
 * caption and a link to where it is acted on; a column below 768 px, a row from it. Nothing waiting:
 * one line, «كل شيء على ما يرام».
 */
export function AttentionCard({
  attention,
}: {
  attention: { title: string; rows: AttentionRowView[]; allClear: string };
}) {
  const headingId = useId();

  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader>
        <CardTitle>
          <h2 id={headingId}>{attention.title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attention.rows.length === 0 ? (
          <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
            <CircleCheckIcon aria-hidden className="text-success" />
            {attention.allClear}
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {attention.rows.map((row) => (
              <li
                key={row.key}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between md:gap-4"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2 text-label">
                    {row.title}
                    {row.badge !== null && <Badge variant="warning">{row.badge}</Badge>}
                  </span>
                  <span className="text-caption text-muted-foreground">{row.caption}</span>
                </div>
                <Button asChild variant="outline" size="sm" className="self-start md:self-center">
                  <Link to={row.action.href}>{row.action.label}</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
