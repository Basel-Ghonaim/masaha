import { Alert, AlertDescription, AlertTitle } from '@shared/design-system';
import type { ReactNode } from 'react';

/**
 * A verified space's notice: its owners, named in its title, edit it, so it shows here read-only,
 * with the way to its page on the public site, in a new tab, and the owners' actions under it
 * (`children`).
 */
export function VerifiedNotice({
  words,
  publicHref,
  children,
}: {
  words: { title: string; description: string; viewOnSite: string };
  publicHref: string;
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
        {children}
      </AlertDescription>
    </Alert>
  );
}
