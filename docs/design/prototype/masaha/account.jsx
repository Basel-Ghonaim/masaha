const { Button: AccButton } = window.MasahaDesignSystem;

// Page shell for /me/* — same header/footer; a small account nav under the title.
function AccountShell({ current, title, description, theme, setTheme, children }) {
  const user = getUser();
  // P4: the same three items the account menu offers, in the page's own navigation.
  const links = [...ACCOUNT_LINKS(), { id: 'settings', label: tr('الإعدادات', 'Settings'), href: 'Settings.html' }];
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader current={current} theme={theme} setTheme={setTheme} />
      <main id="main" className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
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

// The heart is shared.jsx's, one icon for every list and the space page.
Object.assign(window, { AccountShell });
