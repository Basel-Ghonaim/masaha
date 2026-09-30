const { Button: AccButton } = window.MasahaDesignSystem;

// Page shell for /me/* — same header/footer; a small account nav under the title.
function AccountShell({ current, title, description, theme, setTheme, children }) {
  const user = getUser();
  const links = [
    { id: 'favorites', label: tr('المفضّلة', 'Favourites'), href: 'Favorites.html' },
    { id: 'reports', label: tr('بلاغاتي', 'My reports'), href: 'Reports.html' },
    { id: 'settings', label: tr('الإعدادات', 'Settings'), href: 'Settings.html' }
  ];
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader current={current} theme={theme} setTheme={setTheme} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
          {/* Phones: horizontal tabs. Desktop: start-side vertical nav beside the content. */}
          <nav aria-label={tr('الحساب', 'Account')} className="account-nav flex flex-wrap gap-1 border-b border-border pb-2 lg:col-span-3 lg:flex-col lg:pb-0">
            {links.map((l) => (
              <AccButton key={l.id} variant={current === l.id ? 'secondary' : 'ghost'} size="sm" className="lg:w-full lg:justify-start" asChild>
                <a href={l.href + authQ()} aria-current={current === l.id ? 'page' : undefined}>{l.label}</a>
              </AccButton>
            ))}
          </nav>
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-9">
            <div className="flex flex-col gap-1">
              <h1 className="text-heading-1">{title}</h1>
              {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
            </div>
            {user ? children : (
              <p className="text-body">{tr('سجّل الدخول لعرض هذه الصفحة.', 'Sign in to see this page.')} <a href={'Sign in.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + '?auth=1')}>{tr('تسجيل الدخول', 'Sign in')}</a></p>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
      <PageToaster />
    </div>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

Object.assign(window, { AccountShell, HeartIcon });
