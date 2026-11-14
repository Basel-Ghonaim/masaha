import { CONTACT_ICONS } from './contactIcons';
import type { ContactsSectionView } from '../../hooks/contacts/useContactsSection';

/**
 * The contacts as a visitor reaches them: tiles, three columns, two on a phone, each the whole tile
 * a working link, its value isolated left to right, a contact's own name in no known direction. The
 * tile's muted fill is the list item's, so the link's hover lays the ink's wash over it, and the
 * muted caption turns to the foreground there: only the foreground is a verified pair on the wash.
 */
export function ContactsView({ view }: { view: ContactsSectionView }) {
  return (
    <ul aria-label={view.label} className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {view.tiles.map((tile) => {
        const Icon = CONTACT_ICONS[tile.type];
        return (
          <li key={tile.key} className="min-w-0 rounded-lg bg-muted">
            <a
              href={tile.href}
              target={tile.external ? '_blank' : undefined}
              rel={tile.external ? 'noreferrer' : undefined}
              className="group flex min-w-0 items-center gap-3 rounded-lg px-3 py-2 hover:bg-hover-on-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-primary">
                <Icon aria-hidden />
              </span>
              <span className="flex min-w-0 flex-col">
                <span dir={tile.ownName ? 'auto' : undefined} className="truncate text-label">
                  {tile.ownName ? <bdi>{tile.label}</bdi> : tile.label}
                </span>
                <span
                  dir="ltr"
                  className="truncate text-caption text-muted-foreground group-hover:text-foreground"
                >
                  {tile.shown}
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
