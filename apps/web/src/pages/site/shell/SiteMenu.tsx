import { AccountMenuSection } from '@features/users';
import { useCopy } from '@shared/copy';
import {
  Button,
  LogInIcon,
  MenuIcon,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@shared/design-system';
import { useSession } from '@shared/session';
import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { SITE_LINKS, SITE_PATHS } from '../navigation';
import { SiteLanguageToggle } from './toggles';

/**
 * The phone's menu, in a sheet from the start side: the header's links, sign-in or the account once
 * signed in, and the language.
 */
export function SiteMenu() {
  const copy = useCopy();
  const user = useSession((session) => session.user);
  // The sheet is open for the location it was opened at, so any move closes it: a link chosen in
  // it, or the browser's back and forward.
  const { key } = useLocation();
  const [openAt, setOpenAt] = useState<string | null>(null);

  return (
    <Sheet
      open={openAt === key}
      onOpenChange={(open) => {
        setOpenAt(open ? key : null);
      }}
    >
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={copy.site.menu} className="md:hidden">
          <MenuIcon aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="start" closeLabel={copy.site.closeMenu} aria-describedby={undefined}>
        <SheetHeader>
          {/* The dialog is named for what it is, the menu; the wordmark is drawn above it. */}
          <SheetTitle className="sr-only">{copy.site.menu}</SheetTitle>
          <p className="text-heading-3 text-primary">{copy.site.wordmark}</p>
        </SheetHeader>
        <SheetBody>
          <nav aria-label={copy.site.navigation} className="flex flex-col gap-1">
            {SITE_LINKS.map((link) => (
              <Button
                key={link.name}
                asChild
                variant="ghost"
                className="w-full justify-start aria-[current=page]:bg-secondary aria-[current=page]:text-secondary-foreground"
              >
                <NavLink to={link.to} end={link.end}>
                  {copy.site.links[link.name]}
                </NavLink>
              </Button>
            ))}
            {!user && (
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link to={SITE_PATHS.signIn}>
                  <LogInIcon aria-hidden />
                  {copy.site.signIn}
                </Link>
              </Button>
            )}
          </nav>
          {user && <AccountMenuSection user={user} />}
        </SheetBody>
        <SheetFooter>
          <SiteLanguageToggle className="self-start" />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
