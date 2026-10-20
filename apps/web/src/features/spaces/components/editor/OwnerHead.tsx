import { ArrowEndIcon } from '@shared/design-system';

/**
 * The head of an owner's editor: that each section saves alone and shows to visitors at once, and
 * the space's page on the public site, in a new tab, as the shell's own link opens it.
 */
export function OwnerHead({
  intro,
  publicLink,
}: {
  intro: string;
  publicLink: { label: string; href: string };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <p className="text-body-sm text-muted-foreground">{intro}</p>
      <a
        href={publicLink.href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-body-sm text-primary underline underline-offset-4"
      >
        {publicLink.label}
        <ArrowEndIcon aria-hidden />
      </a>
    </div>
  );
}
