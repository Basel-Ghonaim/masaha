import { LiveStatusBadge, statusViewOf } from '@features/directory';
import { useCopy } from '@shared/copy';
import { Card, CardContent } from '@shared/design-system';
import type { LiveStatus } from '@masaha/shared/occupancy';

/** Each live status About explains, in order, and the line that says what it means. */
const TERMS = [
  { status: 'AVAILABLE', meaning: 'available' },
  { status: 'FULL', meaning: 'full' },
  { status: 'CLOSED', meaning: 'closed' },
  { status: null, meaning: 'none' },
] as const satisfies readonly { status: LiveStatus | null; meaning: string }[];

/** «ماذا تعني الحالة؟»'s legend: each status as the cards show it, and what it means. */
export function StatusLegend() {
  const copy = useCopy();
  const words = copy.site.about.status;

  return (
    <Card>
      <CardContent>
        <dl className="flex flex-col gap-4">
          {TERMS.map((term) => (
            <div key={term.meaning} className="flex flex-col gap-1">
              <dt>
                <LiveStatusBadge
                  status={statusViewOf(term.status, copy)}
                  none={copy.directory.status.none}
                />
              </dt>
              <dd className="text-body-sm text-muted-foreground">{words[term.meaning]}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
