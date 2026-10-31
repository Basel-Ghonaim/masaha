import { Alert, AlertDescription, AlertTitle, Button } from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { Link } from 'react-router';
import type { ReportNoticeView } from '../../types/ReportNoticeView';

/**
 * An open report's notice, above the section its field is edited in: an info alert, `#report`,
 * which a link's hash can land on. Open: its title, the report's words with who and when, then
 * «تم التصحيح» and the way to reply on the reports list; once marked, that it was, and the way back.
 */
export function ReportNotice({ view }: { view: ReportNoticeView }) {
  return (
    <Alert
      id="report"
      tabIndex={-1}
      variant="info"
      className="scroll-mt-28 outline-none lg:scroll-mt-20"
    >
      <AlertTitle>{view.title}</AlertTitle>
      <AlertDescription>
        <p dir="auto" className={view.said.message.none ? 'text-muted-foreground' : undefined}>
          {view.said.text}
        </p>
        {view.state === 'open' ? (
          <>
            {view.failure && <FormFailure view={view.failure} />}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                loading={view.resolve.pending}
                disabled={view.resolve.blocked}
                onClick={view.resolve.run}
              >
                {view.resolve.label}
              </Button>
              <Button asChild variant="link" size="sm">
                <Link to={view.open.href}>{view.open.label}</Link>
              </Button>
            </div>
          </>
        ) : (
          <p className="flex flex-wrap items-center gap-2">
            <span>{view.line}</span>
            <Button asChild variant="link" size="sm">
              <Link to={view.back.href}>{view.back.label}</Link>
            </Button>
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}
