import { PlatformContact } from '@features/platform-settings';
import { useCopy } from '@shared/copy';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CONTACT_ANCHOR, OWNERS_ANCHOR, SITE_PATHS } from '../../navigation';
import { StatusLegend } from './StatusLegend';

/**
 * The about page (screen 4, U11), one column: what Masaha is and for whom, with «تصفّح المساحات»;
 * where its information comes from, a verified and an unverified space and the note on freshness;
 * what each live status means; «تواصل معنا» (`#contact`), then «لأصحاب المساحات» (`#owners`), its
 * three steps, each with the platform's configured contact, and only their text with none.
 */
export function AboutPage() {
  const copy = useCopy();
  const words = copy.site.about;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10 md:px-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-heading-1">{copy.site.links.about}</h1>
        <p>{words.intro}</p>
        <p className="text-muted-foreground">{words.audience}</p>
        <Button asChild variant="outline" className="self-start">
          <Link to={SITE_PATHS.spaces}>{copy.site.browseSpaces}</Link>
        </Button>
      </div>
      <AboutSection title={words.source.title}>
        <div className="grid gap-4 md:grid-cols-2">
          {[words.verified, words.unverified].map((kind) => (
            <Card key={kind.title}>
              <CardHeader>
                <CardTitle>
                  <h3>{kind.title}</h3>
                </CardTitle>
                <CardDescription>{kind.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="text-body-sm">{kind.text}</CardContent>
            </Card>
          ))}
        </div>
        <p className="text-body-sm text-muted-foreground">
          {words.source.note}{' '}
          <a href={`#${CONTACT_ANCHOR}`} className="text-primary">
            {words.contact.title}
          </a>
        </p>
      </AboutSection>
      <AboutSection title={words.status.title}>
        <StatusLegend />
      </AboutSection>
      <AboutSection id={CONTACT_ANCHOR} title={words.contact.title}>
        <p>{words.contact.text}</p>
        <PlatformContact layout="row" />
      </AboutSection>
      <AboutSection id={OWNERS_ANCHOR} title={words.owners.title}>
        <ol className="flex list-decimal flex-col gap-2 ps-6">
          {words.owners.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <PlatformContact layout="row" />
      </AboutSection>
    </div>
  );
}

/** One of About's sections: named by its heading, an anchor when `id` is given. */
function AboutSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  const headingId = useId();

  return (
    <section id={id} aria-labelledby={headingId} className="flex scroll-mt-20 flex-col gap-4">
      <h2 id={headingId} className="text-heading-2">
        {title}
      </h2>
      {children}
    </section>
  );
}
