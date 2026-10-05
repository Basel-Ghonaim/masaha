import { AccountMenu } from '@features/users';
import { useCopy } from '@shared/copy';
import { Button, LogInIcon } from '@shared/design-system';
import { DASHBOARD_PATHS } from '@shared/routing';
import { useSession } from '@shared/session';
import { Link, NavLink } from 'react-router';
import { SITE_LINKS, SITE_PATHS } from '../navigation';
import { SiteMenu } from './SiteMenu';
import { SiteLanguageToggle } from './SiteLanguageToggle';
import { SiteThemeToggle } from './SiteThemeToggle';

/**
 * The site's header. On a desktop: the wordmark, the links, the language and theme toggles, and
 * sign-in, or the account once signed in. On a phone: the menu, the wordmark and the theme toggle;
 * the menu holds the rest.
 */
export function SiteHeader() {
  const copy = useCopy();
  const user = useSession((session) => session.user);

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 md:px-8">
        <SiteMenu />
        <Link to={SITE_PATHS.home} className="text-heading-3 text-primary">
          {copy.site.wordmark}
        </Link>
        <nav aria-label={copy.site.navigation} className="ms-6 hidden items-center gap-1 md:flex">
          {SITE_LINKS.map((link) => (
            <Button
              key={link.name}
              asChild
              variant="ghost"
              size="sm"
              className="text-muted-foreground aria-[current=page]:text-foreground"
            >
              <NavLink to={link.to} end={link.end}>
                {copy.site.links[link.name]}
              </NavLink>
            </Button>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <SiteLanguageToggle className="hidden md:inline-flex" />
          <SiteThemeToggle />
          {user ? (
            <AccountMenu
              user={user}
              dashboardPath={DASHBOARD_PATHS.home}
              className="hidden md:inline-flex"
            />
          ) : (
            <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
              <Link to={SITE_PATHS.signIn}>
                <LogInIcon aria-hidden />
                {copy.site.signIn}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
