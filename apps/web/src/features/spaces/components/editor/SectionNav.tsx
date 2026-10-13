import { Button, cn } from '@shared/design-system';
import { Link } from 'react-router';

type SectionLink = { id: string; label: string; current: boolean; choose: () => void };

/**
 * The editor's sections, each a link to its anchor, the one in view marked. A link is the router's,
 * a navigation of its own to the same page's anchor, so the scroll lands on the section and stays
 * there, and the leave guard lets it through. A list kept in view
 * beside the sections from 1024 px, and below it a row of chips that sticks under the top bar and
 * scrolls sideways. `wideOnly` keeps the list and drops the row, for a page of short sections.
 */
export function SectionNav({
  label,
  items,
  wideOnly = false,
}: {
  label: string;
  items: SectionLink[];
  wideOnly?: boolean;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        'lg:sticky lg:top-20 lg:col-span-3 lg:flex lg:flex-col lg:gap-1',
        wideOnly
          ? 'hidden'
          : 'sticky top-14 z-sticky -mx-4 flex gap-2 overflow-x-auto bg-background px-4 py-2 md:-mx-8 md:px-8 lg:mx-0 lg:p-0',
      )}
    >
      {items.map((item) => (
        <Button
          key={item.id}
          asChild
          size="sm"
          variant={item.current ? 'secondary' : 'outline'}
          className="shrink-0 rounded-full lg:w-full lg:justify-start lg:rounded-md lg:border-transparent"
        >
          <Link
            to={{ hash: item.id }}
            aria-current={item.current ? 'location' : undefined}
            onClick={item.choose}
          >
            {item.label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
