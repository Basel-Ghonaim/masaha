import { Alert, AlertDescription, AlertTitle, Button } from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import type { ReportNoticeView } from '../../types/ReportNoticeView';

/** The notice's anchor, which «تعديل الحقل» lands on. */
const NOTICE_ID = 'report';

/**
 * An open report's notice, inside the section its field is edited in: an info alert, `#report`,
 * which a link's hash lands on. It draws from its own read, often after the page's own landing
 * looked for it, so arriving at `#report` it lands on itself once it draws: scrolled to and
 * focused, once per opening. Open: its title, the report's words with who and when, then
 * «تم التصحيح» and the way to reply on the reports list; once marked, that it was, and the way back.
 */
export function ReportNotice({ view }: { view: ReportNoticeView }) {
  const arrived = useLocation().hash === `#${NOTICE_ID}`;
  const self = useRef<HTMLDivElement>(null);
  const landed = useRef(false);
  useEffect(() => {
    if (!arrived || landed.current) return;
    landed.current = true;
    self.current?.scrollIntoView({ block: 'start' });
    self.current?.focus({ preventScroll: true });
  }, [arrived]);

  return (
    <Alert
      ref={self}
      id={NOTICE_ID}
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
