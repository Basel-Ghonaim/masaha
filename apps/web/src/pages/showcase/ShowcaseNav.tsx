import { cn } from '@shared/design-system';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { CATEGORIES, SHOWCASE_ROOT, categoryPath, entriesOf, entryPath } from './registry';

type ShowcaseNavProps = {
  label: string;
  allLabel: string;
  /** The toolbar's settings, carried to every view. */
  search: string;
  /** Called when a link is chosen, so the phone drawer can close. */
  onNavigate?: () => void;
};

type ShowcaseLinkProps = {
  to: string;
  search: string;
  onNavigate?: () => void;
  className?: string;
  children: ReactNode;
};

function ShowcaseLink({ to, search, onNavigate, className, children }: ShowcaseLinkProps) {
  return (
    <NavLink
      end
      to={{ pathname: to, search }}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'block rounded-md px-3 py-1.5 text-body-sm text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          className,
          isActive && 'bg-accent text-accent-foreground',
        )
      }
    >
      {children}
    </NavLink>
  );
}

/**
 * The showcase's navigation, read from the registry: every section, then each category and its
 * entries. Categories and entries show their identifiers, since this page is a development tool.
 */
export function ShowcaseNav({ label, allLabel, search, onNavigate }: ShowcaseNavProps) {
  return (
    <nav aria-label={label} className="flex flex-col gap-4 p-3">
      <ShowcaseLink to={SHOWCASE_ROOT} search={search} onNavigate={onNavigate}>
        {allLabel}
      </ShowcaseLink>
      {CATEGORIES.map((category) => (
        <div key={category} className="flex flex-col gap-1">
          <ShowcaseLink
            to={categoryPath(category)}
            search={search}
            onNavigate={onNavigate}
            className="text-caption text-muted-foreground"
          >
            {category}
          </ShowcaseLink>
          <ul className="flex flex-col">
            {entriesOf(category).map((item) => (
              <li key={item.slug}>
                <ShowcaseLink to={entryPath(item)} search={search} onNavigate={onNavigate}>
                  {item.name}
                </ShowcaseLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
