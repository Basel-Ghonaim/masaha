import {
  Badge,
  Button,
  Card,
  cn,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shared/design-system';
import type { SpacePageView } from '../../types/SpacePageView';
import { Section } from './Section';

/**
 * «ساعات العمل»: a table of the week, Saturday first, equal days grouped, today's row marked
 * («اليوم», `aria-current="date"`); «عرض كل الأيام» lists each day; the shifts named once under it.
 * Hours never saved say so.
 */
export function HoursSection({ hours }: { hours: SpacePageView['hours'] }) {
  return (
    <Section title={hours.title} meta={hours.meta}>
      {hours.none !== null ? (
        <p className="text-body-sm text-muted-foreground">{hours.none}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <Card className="py-0">
            <Table>
              <TableCaption className="sr-only">{hours.caption}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{hours.head.days}</TableHead>
                  <TableHead>{hours.head.hours}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hours.rows.map((row) => (
                  <TableRow
                    key={row.key}
                    className={cn(row.today && 'bg-accent')}
                    {...(row.today && { 'aria-current': 'date' as const })}
                  >
                    <TableCell>
                      <span className="flex flex-wrap items-center gap-2">
                        {row.label}
                        {row.today && <Badge variant="primary">{hours.todayBadge}</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className={cn(row.closed && 'text-muted-foreground')}>
                      {row.value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          {hours.toggle !== null && (
            <Button
              variant="link"
              size="sm"
              className="self-start"
              aria-expanded={hours.toggle.expanded}
              onClick={hours.toggle.run}
            >
              {hours.toggle.label}
            </Button>
          )}
          {hours.shifts !== null && (
            <p className="text-body-sm text-muted-foreground">{hours.shifts}</p>
          )}
        </div>
      )}
    </Section>
  );
}
