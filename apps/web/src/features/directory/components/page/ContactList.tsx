import type { ContactLink } from '../../services/contactLinks';

/**
 * A space's contacts, one link each: its type's word (a phone's with its carrier), then its value as
 * stored, left to right and cut short rather than overflowing. WhatsApp and the addresses on the web
 * open in a new tab.
 */
export function ContactList({ items }: { items: ContactLink[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.key}>
          <a
            href={item.href}
            {...(item.external && { target: '_blank', rel: 'noopener' })}
            className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-body-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="shrink-0 text-label">{item.label}</span>{' '}
            <span dir="ltr" className="min-w-0 truncate text-muted-foreground">
              {item.value}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
