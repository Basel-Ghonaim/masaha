import { usePlatformContact } from '@features/platform-settings/public';
import { useCopy } from '@shared/copy';
import { Button, Card, CardContent } from '@shared/design-system';
import { useId, type ReactNode } from 'react';

/** A list item's words: whole, or its parts in order, the bold ones `{ strong }`. */
type Item = string | readonly (string | { readonly strong: string })[];

/**
 * The privacy policy (screen 33), one reading column: the title and the date of its last update,
 * then each section of the owner's approved text, named by its heading. The last one gives the
 * platform's email, from its public contact (the email alone, which the text names): nothing while
 * it is read (DI31), and the sentence alone when no email is set or the read failed, as About's
 * text stays with no contact.
 */
export function PrivacyPage() {
  const copy = useCopy();
  const words = copy.site.privacy;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-14 px-4 py-10 md:px-8 md:py-16">
      <div className="flex flex-col gap-4">
        <h1 className="text-heading-1">{copy.site.links.privacy}</h1>
        <p className="text-muted-foreground">
          <strong>{words.updated.label}</strong> <span dir="ltr">{words.updated.date}</span>
        </p>
      </div>
      <PolicySection title={words.intro.title}>
        <p>{words.intro.text}</p>
      </PolicySection>
      <PolicySection title={words.collect.title}>
        <PolicyList items={words.collect.items} />
      </PolicySection>
      <PolicySection title={words.dontCollect.title}>
        <PolicyList items={words.dontCollect.items} />
      </PolicySection>
      <PolicySection title={words.use.title}>
        <PolicyList items={words.use.items} />
        <p className="text-muted-foreground">{words.use.note}</p>
      </PolicySection>
      <PolicySection title={words.cookies.title}>
        <p>{words.cookies.text}</p>
      </PolicySection>
      <PolicySection title={words.whoSees.title}>
        <PolicyList items={words.whoSees.items} />
      </PolicySection>
      <PolicySection title={words.protect.title}>
        <PolicyList items={words.protect.items} />
      </PolicySection>
      <PolicySection title={words.retention.title}>
        <PolicyList items={words.retention.items} />
      </PolicySection>
      <PolicySection title={words.rights.title}>
        <PolicyList items={words.rights.items} />
      </PolicySection>
      <PolicySection title={words.changes.title}>
        <p>{words.changes.text}</p>
      </PolicySection>
      <PolicySection title={words.contact.title}>
        <Card>
          <CardContent className="pt-5">
            <PrivacyContact />
          </CardContent>
        </Card>
      </PolicySection>
    </div>
  );
}

/**
 * The contact's sentence, then the platform's email as a link styled as a button: its word, then
 * its value left to right; with no email, the sentence alone.
 */
function PrivacyContact() {
  const copy = useCopy();
  const words = copy.site.privacy.contact;
  const contact = usePlatformContact();
  const email =
    contact.state === 'ready'
      ? contact.channels.find((channel) => channel.kind === 'email')
      : undefined;

  return (
    <p>
      {words.text}
      {email && (
        <>
          {' '}
          <Button asChild variant="outline">
            <a href={email.href}>
              <span>{copy.platformSettings.contact.email}</span>{' '}
              <span dir="ltr" className="text-muted-foreground">
                {email.value}
              </span>
            </a>
          </Button>
          {words.end}
        </>
      )}
    </p>
  );
}

/** One of the policy's sections, named by its heading. */
function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <h2 id={headingId} className="text-heading-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** The words of an item, its parts joined: its key, as no two items say the same. */
function wordsOf(item: Item): string {
  return typeof item === 'string'
    ? item
    : item.map((part) => (typeof part === 'string' ? part : part.strong)).join('');
}

/** A bulleted list of the policy's items, each part in bold where the text is bold. */
function PolicyList({ items }: { items: readonly Item[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 ps-6">
      {items.map((item) => (
        <li key={wordsOf(item)}>
          {typeof item === 'string'
            ? item
            : item.map((part) =>
                typeof part === 'string' ? part : <strong key={part.strong}>{part.strong}</strong>,
              )}
        </li>
      ))}
    </ul>
  );
}
