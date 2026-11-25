import { Button } from '@shared/design-system';
import type { ContactLink } from '@shared/lib';

/** A contact's words: its type's word (or its own name, isolated), then its value, left to right. */
function ContactWords({ item, quiet }: { item: ContactLink; quiet: boolean }) {
  return (
    <>
      <span {...(item.ownName && { dir: 'auto' })} className="shrink-0 text-label">
        {item.label}
      </span>{' '}
      <span
        dir="ltr"
        className={quiet ? 'min-w-0 truncate text-muted-foreground' : 'min-w-0 truncate'}
      >
        {item.value}
      </span>
    </>
  );
}

/**
 * A space's contacts, one link each: its type's word (a phone's with its carrier, or a contact of
 * another kind's own name, isolated), then its value as stored, left to right and cut short rather
 * than overflowing. WhatsApp and the addresses on the web open in a new tab. The `lead`, from 768 px,
 * comes first as the page's main action (Button's `main`, ADR 0022), with the same words; the others
 * keep their outlined rows.
 */
export function ContactList({ lead, items }: { lead: ContactLink | null; items: ContactLink[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {lead !== null && (
        <li key={lead.key}>
          <Button asChild variant="main" className="h-auto w-full justify-between gap-3 px-4 py-3">
            <a href={lead.href} {...(lead.external && { target: '_blank', rel: 'noopener' })}>
              <ContactWords item={lead} quiet={false} />
            </a>
          </Button>
        </li>
      )}
      {items.map((item) => (
        <li key={item.key}>
          <a
            href={item.href}
            {...(item.external && { target: '_blank', rel: 'noopener' })}
            className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-body-sm transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ContactWords item={item} quiet />
          </a>
        </li>
      ))}
    </ul>
  );
}
