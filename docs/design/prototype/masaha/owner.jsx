const { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, DropdownMenu: ODropdown, DropdownMenuTrigger: ODropdownTrigger, DropdownMenuContent: ODropdownContent, DropdownMenuItem: ODropdownItem, DropdownMenuLabel: ODropdownLabel, DropdownMenuSeparator: ODropdownSep, Avatar: OAvatar, AvatarFallback: OAvatarFallback, Button: OButton, Badge: OBadge, LanguageToggle: OLang, ThemeToggle: OTheme, ChevronsUpDownIcon, ChevronDownIcon: OChevDown, CheckIcon: OCheck, InfoIcon, LogInIcon: OLogIn, UsersIcon, CircleAlertIcon: OAlertIcon, EyeIcon: OEye, CalendarIcon, TriangleAlertIcon, EllipsisIcon, ArrowUpIcon: OArrowUp, LogOutIcon: OLogOut, CircleCheckIcon: OCircleCheck, SearchIcon: OSearch, XIcon: OX } = window.MasahaDesignSystem;
const O = window.OWNER;

// Role: ?role=reception shows the front-desk staff view; everything else is the owner.
const ROLE = pageParams.get('role') === 'reception' ? 'reception' : 'owner';
const IS_OWNER = ROLE === 'owner';
const roleQ = (href) => (href === '#' || IS_OWNER ? href : href + (href.includes('?') ? '&' : '?') + 'role=reception');
const STAFF = IS_OWNER ? { name: tr('أحمد', 'Ahmad'), email: 'ahmad@example.com', role: tr('صاحب المساحة', 'Owner') } : { name: tr('سامي', 'Sami'), email: 'sami@example.com', role: tr('موظف استقبال', 'Reception') };

// Icons: the DS set has no dashboard, receipt, chart, tag, building, megaphone, flag, id-card or gear glyphs — closest DS icons used.
// P3: grouped by what the owner does — today's work first. Reception's four items need no groups.
const OWNER_NAV = () => IS_OWNER ? [
  { items: [{ id: 'overview', label: tr('نظرة عامة', 'Overview'), href: 'Owner overview.html', icon: <InfoIcon /> }] },
  { label: tr('اليوم', 'Today'), items: [
    { id: 'desk', label: tr('مكتب الاستقبال', 'Front desk'), href: 'Desk.html', icon: <OLogIn /> },
    { id: 'customers', label: tr('الزبائن', 'Customers'), href: 'Customers.html', icon: <UsersIcon /> },
    { id: 'payments', label: tr('الدفعات', 'Payments'), href: 'Payments.html', icon: <OCircleCheck /> }
  ] },
  { label: tr('المال', 'Money'), items: [
    { id: 'finance', label: tr('المالية والتقارير', 'Finance & reports'), href: 'Finance.html', icon: <OArrowUp /> },
    { id: 'packages', label: tr('الباقات والأسعار', 'Packages & prices'), href: 'Packages.html', icon: <CalendarIcon /> }
  ] },
  { label: tr('المساحة', 'The space'), items: [
    { id: 'profile', label: tr('ملف المساحة', 'Space profile'), href: 'Owner space profile.html', icon: <OEye /> },
    { id: 'announcements', label: tr('الإعلانات', 'Announcements'), href: 'Announcements.html', icon: <OAlertIcon /> },
    { id: 'data-reports', label: tr('بلاغات البيانات', 'Data reports'), href: 'Data reports.html', icon: <TriangleAlertIcon />, badge: 2 }
  ] },
  { label: tr('الفريق والإعدادات', 'Team & settings'), items: [
    { id: 'staff', label: tr('الموظفون', 'Staff'), href: 'Staff.html', icon: <ChevronsUpDownIcon /> },
    { id: 'settings', label: tr('الإعدادات', 'Settings'), href: 'Owner settings.html', icon: <EllipsisIcon /> }
  ] }
] : [
  { items: [
    { id: 'desk', label: tr('مكتب الاستقبال', 'Front desk'), href: 'Desk.html', icon: <OLogIn /> },
    { id: 'customers', label: tr('الزبائن', 'Customers'), href: 'Customers.html', icon: <UsersIcon /> },
    { id: 'my-payments', label: tr('دفعاتي اليوم', 'My payments today'), href: 'My payments.html', icon: <OCircleCheck /> },
    { id: 'announcements', label: tr('الإعلانات', 'Announcements'), href: 'Announcements.html', icon: <OAlertIcon /> }
  ] }
];

const publicState = (present, cap, closed) => (closed ? 'closed' : present >= cap ? 'full' : 'open');
const STATE_WORD = () => ({ open: ['success', tr('متاح', 'Available')], full: ['warning', tr('ممتلئ', 'Full')], closed: ['neutral', tr('مغلق الآن', 'Closed now')] });

// «ضبط الحالة»: set any public state for a while, only inside opening hours. A new override replaces the old one.
// Kept in sessionStorage so it follows across pages; ?override=full|open|closed:minutes demos it; ?hours=closed demos outside hours.
const OVERRIDE_KEY = 'masaha:override';
const minsToClose = () => (window.DESK ? DESK.toMin(DESK.CLOSE) - DESK.toMin(DESK.NOW) : 320);
const INSIDE_HOURS = pageParams.get('hours') !== 'closed';
function useOverride() {
  const demo = pageParams.get('override');
  const [ov, setOv] = React.useState(() => {
    if (demo) {
          // A bare number is the old format («?override=30»); it means Full for that many minutes.
          const [a, b] = demo.split(':');
          const [st, m] = /^\d+$/.test(a) ? ['full', a] : [a, b];
          return { state: STATE_WORD()[st] ? st : 'full', until: Date.now() + Number(m || 84) * 60000 };
        }
    try { const v = JSON.parse(sessionStorage.getItem(OVERRIDE_KEY)); return v && v.until > Date.now() ? v : null; } catch (e) { return null; }
  });
  const [, tick] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => { if (!ov) return; const t = setInterval(() => { if (Date.now() >= ov.until) setOv(null); tick(); }, 1000); return () => clearInterval(t); }, [ov]);
  const set = (state, mins) => { const v = state ? { state, until: Date.now() + mins * 60000 } : null; setOv(v); try { v ? sessionStorage.setItem(OVERRIDE_KEY, JSON.stringify(v)) : sessionStorage.removeItem(OVERRIDE_KEY); } catch (e) {} };
  const left = ov ? Math.max(0, Math.round((ov.until - Date.now()) / 1000)) : 0;
  return { active: !!ov, state: ov && ov.state, left, set };
}
const hmLeft = (s) => { const m = Math.ceil(s / 60); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); };

// The state's own colours, as Badge draws them, so one control can be read at a glance.
const STATE_SKIN = { open: 'border-success bg-success-subtle text-success-subtle-foreground', full: 'border-warning bg-warning-subtle text-warning-subtle-foreground', closed: 'border-border bg-secondary text-secondary-foreground' };

// Read-only, for a page that reports the state without offering to change it.
function PublicStateBadge({ state, ov }) {
  const W = STATE_WORD();
  if (ov && ov.active) {
    const [v, w] = W[ov.state];
    return <OBadge variant={v}><span>{tr('يظهر للزوار:', 'Visitors see:')} {w} {tr('يدويًا', 'manually')} · <Num>{hmLeft(ov.left)}</Num> {tr('متبقية', 'left')}</span></OBadge>;
  }
  const [v, w] = W[state];
  return <OBadge variant={v}><span>{tr('يظهر للزوار:', 'Visitors see:')} {w}</span></OBadge>;
}

// P2: one control. Its label is what visitors see, in the state's colour; it opens the panel
// that changes it, which also holds the way back to the automatic state.
function PublicStateControl({ state, ov }) {
  const { Popover, PopoverTrigger, PopoverContent, ToggleGroup, ToggleGroupItem } = window.MasahaDesignSystem;
  const [open, setOpen] = React.useState(pageParams.get('publicstate') === 'open');
  const [st, setSt] = React.useState(ov.state || 'full');
  const wide = useIsTablet();
  const W = STATE_WORD();
  const shown = ov.active ? ov.state : state;
  const opts = [[30, tr('30 د', '30 min')], [60, tr('ساعة', '1 hour')], [120, tr('ساعتين', '2 hours')], [minsToClose(), tr('حتى الإغلاق', 'Until closing')]];
  const apply = (m) => { ov.set(st, m); setOpen(false); window.MasahaDesignSystem.toast.success(tr(`تظهر المساحة «${W[st][1]}» للزوار`, `Visitors now see «${W[st][1]}»`)); };
  // The decision asks for a short form on a phone «inside the one top-bar row». With P1's «⋯»
    // also in the bar, 390 fits the state word but not the countdown without eating the page
    // title, so the countdown moves one tap away, into the panel and the control's name.
    const left = ov.active ? hmLeft(ov.left) : null;
    const label = wide
      ? <>{tr('يظهر للزوار:', 'Visitors see:')} {W[shown][1]}{ov.active && <> {tr('يدويًا', 'manually')} · <Num>{left}</Num></>}</>
      : <>{W[shown][1]}</>;
    const name = ov.active
      ? tr(`يظهر للزوار: ${W[shown][1]} يدويًا، ${left} متبقية — غيّرها`, `Visitors see: ${W[shown][1]} manually, ${left} left — change it`)
      : tr(`يظهر للزوار: ${W[shown][1]} — غيّرها`, `Visitors see: ${W[shown][1]} — change it`);
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <OButton variant="outline" size="sm" className={STATE_SKIN[shown]} disabled={!INSIDE_HOURS} aria-label={name}>
            {label}{wide && <OChevDown />}
          </OButton>
        </PopoverTrigger>
        <PopoverContent align="start" className="flex w-72 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-label">{tr('الحالة التي يراها الزوار', 'What visitors see')}</span>
                        {ov.active && <p className="text-caption text-muted-foreground">{tr('الآن:', 'Now:')} {W[shown][1]} {tr('يدويًا', 'manually')} · <Num>{left}</Num> {tr('متبقية', 'left')}</p>}
            <ToggleGroup type="single" value={st} onValueChange={(v) => v && setSt(v)}>
              {['open', 'full', 'closed'].map((k) => <ToggleGroupItem key={k} value={k}>{W[k][1]}</ToggleGroupItem>)}
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-label">{tr('لمدة', 'For')}</span>
            <div className="grid grid-cols-2 gap-2">{opts.map(([m, l]) => <OButton key={l} variant="outline" size="sm" onClick={() => apply(m)}>{l}</OButton>)}</div>
          </div>
          {ov.active && <OButton variant="ghost" size="sm" onClick={() => { ov.set(null); setOpen(false); }}><OX />{tr('العودة للحالة التلقائية', 'Back to the automatic state')}</OButton>}
          <p className="text-caption text-muted-foreground">{ov.active ? tr('يحلّ محل الضبط الحالي. ', 'Replaces the current setting. ') : ''}{tr('بعدها تعود الحالة تلقائيًا حسب الحضور.', 'After that the state follows attendance again.')}</p>
        </PopoverContent>
      </Popover>
      {!INSIDE_HOURS && <span className="text-caption text-muted-foreground">{tr('متاح خلال ساعات العمل فقط', 'Only during opening hours')}</span>}
    </span>
  );
}

// SH-006: the space's mark is the switcher's trigger, so the 768 rail still says which space
// you are in. SidebarHeader's `mark` stays visible when it collapses; its children turn sr-only.
const SpaceMark = ({ space }) => (
  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-label text-primary-foreground" aria-hidden="true">{space.name[0]}</span>
);

function SpaceSwitcher({ collapsed }) {
  const { Tooltip, TooltipTrigger, TooltipContent } = window.MasahaDesignSystem;
  const [cur, setCur] = React.useState(O.spaces[0]);
  const switchLabel = tr('تبديل المساحة', 'Switch space') + ' — ' + cur.name;
  // On the rail only the mark fits; the button keeps its aria-label, so it is still named.
  const head = (
    <>
      <SpaceMark space={cur} />
      {!collapsed && (
        <span className="flex min-w-0 flex-1 flex-col">
          <span lang="en" className="truncate text-label">{cur.name}</span>
          <span className="truncate text-caption text-muted-foreground">{cur.area}</span>
        </span>
      )}
    </>
  );
  if (!IS_OWNER) return <div className="flex w-full items-center gap-3 p-2">{head}</div>;
  const trigger = (
    <button type="button" className="flex w-full items-center gap-3 rounded-md p-2 text-start hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-label={switchLabel}>
      {head}{!collapsed && <ChevronsUpDownIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
    </button>
  );
  return (
    <ODropdown dir={DIR}>
      <ODropdownTrigger asChild>
        {collapsed
          ? <Tooltip><TooltipTrigger asChild>{trigger}</TooltipTrigger><TooltipContent>{switchLabel}</TooltipContent></Tooltip>
          : trigger}
      </ODropdownTrigger>
      <ODropdownContent align="start">
        <ODropdownLabel>{tr('مساحاتك', 'Your spaces')}</ODropdownLabel>
        {O.spaces.map((s) => (
          <ODropdownItem key={s.id} onSelect={() => setCur(s)}>
            <span className="flex flex-1 flex-col"><span lang="en">{s.name}</span><span className="text-caption text-muted-foreground">{s.area}</span></span>
            {s.id === cur.id && <OCheck className="size-4" aria-hidden="true" />}
          </ODropdownItem>
        ))}
      </ODropdownContent>
    </ODropdown>
  );
}

// P4: one account menu, the shared one. DI-2: `md:inline` is not in the bundle, so the name
// never appeared from 768; `md:inline-flex` is.
function OwnerUserMenu({ theme, setTheme }) {
  const u = STAFF;
  return (
    <ODropdown dir={DIR}>
      <ODropdownTrigger asChild>
        <OButton variant="ghost" size="sm" aria-label={tr('قائمة الحساب', 'Account menu') + ' — ' + u.name}>
          <OAvatar size="sm" aria-hidden="true"><OAvatarFallback>{u.name[0]}</OAvatarFallback></OAvatar><span className="hidden md:inline-flex">{u.name}</span>
        </OButton>
      </ODropdownTrigger>
      <AccountMenuContent
        user={u}
        area="dashboard"
        theme={theme}
        setTheme={setTheme}
        onSignOut={() => { location.href = carryParams('Home.html?auth=0'); }}
      />
    </ODropdown>
  );
}

// DI-10 (decided 2026-10-13): on a phone the bar has no room for the account, so it heads the drawer,
// whose foot already holds the theme and the language — so the menu opened here leaves them out.
function DrawerAccount() {
  const u = STAFF;
  return (
    <ODropdown dir={DIR}>
      <ODropdownTrigger asChild>
        <button type="button" className="flex w-full items-center gap-3 rounded-md p-2 text-start hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-label={tr('قائمة الحساب', 'Account menu') + ' — ' + u.name}>
          <OAvatar size="sm" aria-hidden="true"><OAvatarFallback>{u.name[0]}</OAvatarFallback></OAvatar>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-label">{u.name} · {u.role}</span>
            <span dir="ltr" className="truncate text-caption text-muted-foreground">{u.email}</span>
          </span>
          <ChevronsUpDownIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        </button>
      </ODropdownTrigger>
      <AccountMenuContent user={u} area="dashboard" onSignOut={() => { location.href = carryParams('Home.html?auth=0'); }} />
    </ODropdown>
  );
}

// state: the automatic public state; a manual override turns it to Full while it runs.
function OwnerShell({ current, title, state = 'open', theme, setTheme, bottomAction, actions, loadError, children }) {
  const ov = useOverride();
  const base = INSIDE_HOURS ? state : 'closed';
  // The 768–1023 rail: the sidebar collapses to icons there, so the switcher needs its tooltip.
  // Both hooks run on every render (no short-circuit): skipping one on phones would reorder the hooks.
  const tablet = useIsTablet();
  const desktop = useIsDesktop();
  const rail = tablet && !desktop;
  const phone = !tablet;
  // ?drawer=open: the phone's drawer, open, for the board (its open state is the layer's own).
  React.useEffect(() => { if (phone && pageParams.get('drawer') === 'open') { const b = document.querySelector('[data-slot=sidebar-inset] > header button'); if (b) b.click(); } }, []);
    const route = routeState();
      const failed = pageParams.get('state') === 'error';
  return (
    <SidebarProvider className="bg-background text-foreground">
      <SkipLink />
      <Sidebar label={tr('لوحة إدارة المساحة', 'Space dashboard')}>
        <div className="sidebar-stick">
        {phone && <div className="border-b border-sidebar-border p-2"><DrawerAccount /></div>}
        <SidebarHeader mark={<SpaceSwitcher collapsed={rail} />} />
        <SidebarContent>
          {OWNER_NAV().map((g, i) => (
            <SidebarGroup key={g.label || i}>
              {g.label && <SidebarGroupLabel>{g.label}</SidebarGroupLabel>}
              <SidebarMenu>
                {g.items.map((n) => (
                  <SidebarMenuItem key={n.id}>
                    <SidebarMenuButton href={roleQ(n.href)} icon={n.icon} label={n.label} isActive={current === n.id} badge={n.badge} badgeLabel={n.badge ? tr('بلاغات جديدة', 'new reports') : undefined} />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <OButton variant="ghost" className="w-full justify-start" asChild><a href="Space details.html?id=focus" target="_blank" rel="noopener" aria-label={tr('عرض الصفحة العامة', 'View public page')}><OEye /><span className="owner-collapse-hide">{tr('عرض الصفحة العامة', 'View public page')}</span></a></OButton>
          {/* SH-005: a phone has no room for the toggles in the bar, so the drawer's foot carries both. */}
          <div className="flex items-center gap-1 md:hidden">
            <OLang lang={LANG === 'en' ? 'ar' : 'en'} label={LANG === 'en' ? 'العربية' : 'English'} onClick={switchLang} />
            <OTheme theme={theme} onThemeChange={setTheme} label={theme === 'light' ? tr('المظهر الداكن', 'Dark theme') : tr('المظهر الفاتح', 'Light theme')} />
          </div>
        </SidebarFooter>
        </div>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex min-h-14 flex-wrap items-center gap-x-2 gap-y-2 border-b border-border bg-background px-4 py-2 md:gap-x-3 md:px-8">
          <SidebarTrigger label={tr('القائمة', 'Menu')} />
          <h1 className="min-w-0 flex-1 truncate text-heading-3">{title}</h1>
          <PageActions actions={actions} />
          <PublicStateControl state={base} ov={ov} />
          <div className="ms-auto hidden items-center gap-1 md:flex">
            <OLang lang={LANG === 'en' ? 'ar' : 'en'} label={LANG === 'en' ? 'العربية' : 'English'} onClick={switchLang} className="hidden md:inline-flex" />
            <OTheme theme={theme} onThemeChange={setTheme} label={theme === 'light' ? tr('المظهر الداكن', 'Dark theme') : tr('المظهر الفاتح', 'Light theme')} className="hidden md:inline-flex" />
            <OwnerUserMenu theme={theme} setTheme={setTheme} />
          </div>
                  </header>
        <main id="main" className={'flex flex-1 flex-col gap-6 px-4 py-6 md:px-8 ' + (bottomAction ? 'pb-28 md:pb-6' : '')}>
          {route ? <RouteState state={route} /> : failed ? <LoadError what={loadError} /> : children}
        </main>
        {bottomAction && !route && <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t border-border bg-background px-4 py-3 md:hidden">{bottomAction}</div>}
      </SidebarInset>
      <PageToaster bottomBar={!!bottomAction && !route} />
    </SidebarProvider>
  );
}

// Numbers and ratios stay LTR and isolated inside Arabic text ("27 / 40").
const Num = ({ children }) => { const f = [].concat(children); const text = f.every((c) => typeof c === 'string' || typeof c === 'number'); return <span dir="ltr" className="num-iso">{text ? f.join('') : children}</span>; };
Object.assign(window, { OwnerShell, PublicStateBadge, PublicStateControl, publicState, Num, ROLE, IS_OWNER, roleQ, STAFF });
