import { useCopy } from '@shared/copy';
import { Button } from '@shared/design-system';
import { useId } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { ACCOUNT_LINKS } from '../navigation';

/**
 * The account's pages inside the site's shell: their navigation, named «حسابي» (its label read by
 * assistive technology below 1024 px and shown from it, DI-57), the page open marked current; a row
 * over the page on a phone, a column beside it from 1024 px. Each page draws its own heading.
 */
export function AccountLayout() {
  const copy = useCopy();
  const labelId = useId();
  const { pathname } = useLocation();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
      <nav aria-labelledby={labelId} className="flex flex-col gap-2 lg:col-span-3">
        <p id={labelId} className="sr-only text-label text-muted-foreground lg:not-sr-only">
          {copy.site.account.navigation}
        </p>
        <ul className="flex flex-wrap gap-1 border-b border-border pb-2 lg:flex-col lg:border-b-0 lg:pb-0">
          {ACCOUNT_LINKS.map((link) => {
            const current = pathname === link.to;
            return (
              <li key={link.key}>
                <Button
                  asChild
                  size="sm"
                  variant={current ? 'secondary' : 'ghost'}
                  className="lg:w-full lg:justify-start"
                >
                  <Link to={link.to} aria-current={current ? 'page' : undefined}>
                    {copy.site.account[link.key]}
                  </Link>
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-9">
        <Outlet />
      </div>
    </div>
  );
}
