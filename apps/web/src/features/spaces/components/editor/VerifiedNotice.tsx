import { Alert, AlertDescription, AlertTitle } from '@shared/design-system';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * A verified space's notice: its owners, named in its title, edit it, so it shows here read-only,
 * with the way to its page on the public site, in a new tab, «لتصحيح معلومة:» with the link to the
 * space's reports (`reports`), and the owners' actions under it (`children`).
 */
export function VerifiedNotice({
  words,
  publicHref,
  reports,
  children,
}: {
  words: { title: string; description: string; viewOnSite: string; correct: string };
  publicHref: string;
  reports: { label: string; href: string };
  children?: ReactNode;
}) {
  return (
    <Alert variant="info">
      <AlertTitle>{words.title}</AlertTitle>
      <AlertDescription>
        <p>{words.description}</p>
        <p>
          <a
            href={publicHref}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            {words.viewOnSite}
          </a>
        </p>
        <p>
          {words.correct}{' '}
          <Link to={reports.href} className="underline underline-offset-4">
            {reports.label}
          </Link>
        </p>
        {children}
      </AlertDescription>
    </Alert>
  );
}
