import { Alert, AlertDescription, AlertTitle } from '@shared/design-system';

/**
 * A verified space's notice: its owner edits it, so it shows here read-only, with the way to its
 * page on the public site, in a new tab.
 */
export function VerifiedNotice({
  words,
  publicHref,
}: {
  words: { title: string; description: string; viewOnSite: string };
  publicHref: string;
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
      </AlertDescription>
    </Alert>
  );
}
