const { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, DropdownMenu: ODropdown, DropdownMenuTrigger: ODropdownTrigger, DropdownMenuContent: ODropdownContent, DropdownMenuItem: ODropdownItem, DropdownMenuLabel: ODropdownLabel, DropdownMenuSeparator: ODropdownSep, Avatar: OAvatar, AvatarFallback: OAvatarFallback, Button: OButton, Badge: OBadge, LanguageToggle: OLang, ThemeToggle: OTheme, ChevronsUpDownIcon, ChevronDownIcon: OChevDown, CheckIcon: OCheck, InfoIcon, LogInIcon: OLogIn, UsersIcon, CircleAlertIcon: OAlertIcon, EyeIcon: OEye, CalendarIcon, TriangleAlertIcon, EllipsisIcon, ArrowUpIcon: OArrowUp, LogOutIcon: OLogOut, CircleCheckIcon: OCircleCheck, SearchIcon: OSearch, XIcon: OX } = window.MasahaDesignSystem;
const O = window.OWNER;

// Role: ?role=reception shows the front-desk staff view; everything else is the owner.
const ROLE = pageParams.get('role') === 'reception' ? 'reception' : 'owner';
const IS_OWNER = ROLE === 'owner';
const roleQ = (href) => (href === '#' || IS_OWNER ? href : href + (href.includes('?') ? '&' : '?') + 'role=reception');
const STAFF = IS_OWNER ? { name: tr('أحمد', 'Ahmad'), email: 'ahmad@example.com', role: tr('صاحب المساحة', 'Owner') } : { name: tr('سامي', 'Sami'), email: 'sami@example.com', role: tr('موظف استقبال', 'Reception') };

// Icons: the DS set has no dashboard, receipt, chart, tag, building, megaphone, flag, id-card or gear glyphs — closest DS icons used.
const OWNER_NAV = () => IS_OWNER ? [
  { id: 'overview', label: tr('نظرة عامة', 'Overview'), href: 'Owner overview.html', icon: <InfoIcon /> },
  { id: 'desk', label: tr('مكتب الاستقبال', 'Front desk'), href: 'Desk.html', icon: <OLogIn /> },
  { id: 'customers', label: tr('الزبائن', 'Customers'), href: 'Customers.html', icon: <UsersIcon /> },
  { id: 'payments', label: tr('الدفعات', 'Payments'), href: 'Payments.html', icon: <OCircleCheck /> },
  { id: 'finance', label: tr('المالية والتقارير', 'Finance & reports'), href: 'Finance.html', icon: <OArrowUp /> },
  { id: 'packages', label: tr('الباقات والأسعار', 'Packages & prices'), href: 'Packages.html', icon: <CalendarIcon /> },
  { id: 'profile', label: tr('ملف المساحة', 'Space profile'), href: 'Owner space profile.html', icon: <OEye /> },
  { id: 'announcements', label: tr('الإعلانات', 'Announcements'), href: 'Announcements.html', icon: <OAlertIcon /> },
  { id: 'data-reports', label: tr('بلاغات البيانات', 'Data reports'), href: 'Data reports.html', icon: <TriangleAlertIcon />, badge: 2 },
  { id: 'staff', label: tr('الموظفون', 'Staff'), href: 'Staff.html', icon: <ChevronsUpDownIcon /> },
  { id: 'settings', label: tr('الإعدادات', 'Settings'), href: 'Owner settings.html', icon: <EllipsisIcon /> }
] : [
  { id: 'desk', label: tr('مكتب الاستقبال', 'Front desk'), href: 'Desk.html', icon: <OLogIn /> },
  { id: 'customers', label: tr('الزبائن', 'Customers'), href: 'Customers.html', icon: <UsersIcon /> },
  { id: 'my-payments', label: tr('دفعاتي اليوم', 'My payments today'), href: 'My payments.html', icon: <OCircleCheck /> },
  { id: 'announcements', label: tr('الإعلانات', 'Announcements'), href: 'Announcements.html', icon: <OAlertIcon /> }
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
    if (demo) { const [st, m] = demo.split(':'); return { state: st, until: Date.now() + Number(m || 84) * 60000 }; }
    try { const v = JSON.parse(sessionStorage.getItem(OVERRIDE_KEY)); return v && v.until > Date.now() ? v : null; } catch (e) { return null; }
  });
  const [, tick] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => { if (!ov) return; const t = setInterval(() => { if (Date.now() >= ov.until) setOv(null); tick(); }, 1000); return () => clearInterval(t); }, [ov]);
  const set = (state, mins) => { const v = state ? { state, until: Date.now() + mins * 60000 } : null; setOv(v); try { v ? sessionStorage.setItem(OVERRIDE_KEY, JSON.stringify(v)) : sessionStorage.removeItem(OVERRIDE_KEY); } catch (e) {} };
  const left = ov ? Math.max(0, Math.round((ov.until - Date.now()) / 1000)) : 0;
  return { active: !!ov, state: ov && ov.state, left, set };
}
const hmLeft = (s) => { const m = Math.ceil(s / 60); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); };

function PublicStateBadge({ state, ov }) {
  const W = STATE_WORD();
  if (ov && ov.active) {
    const [v, w] = W[ov.state];
    return <OBadge variant={v}><span>{tr('يظهر للزوار:', 'Visitors see:')} {w} {tr('يدويًا', 'manually')} · <Num>{hmLeft(ov.left)}</Num> {tr('متبقية', 'left')}</span></OBadge>;
  }
  const [v, w] = W[state];
  return <OBadge variant={v}><span>{tr('يظهر للزوار:', 'Visitors see:')} {w}</span></OBadge>;
}

function StatusControl({ ov }) {
  const { Popover, PopoverTrigger, PopoverContent, ToggleGroup, ToggleGroupItem } = window.MasahaDesignSystem;
  const [open, setOpen] = React.useState(pageParams.get('status') === 'open');
  const [st, setSt] = React.useState(ov.state || 'full');
  const W = STATE_WORD();
  const opts = [[30, tr('30 د', '30 min')], [60, tr('ساعة', '1 hour')], [120, tr('ساعتين', '2 hours')], [minsToClose(), tr('حتى الإغلاق', 'Until closing')]];
  const apply = (m) => { ov.set(st, m); setOpen(false); window.MasahaDesignSystem.toast(tr(`تظهر المساحة «${W[st][1]}» للزوار`, `Visitors now see «${W[st][1]}»`)); };
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild><OButton variant="outline" size="sm" disabled={!INSIDE_HOURS}>{tr('ضبط الحالة', 'Set status')}<OChevDown /></OButton></PopoverTrigger>
        <PopoverContent align="start" className="flex w-72 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-label">{tr('الحالة التي يراها الزوار', 'What visitors see')}</span>
            <ToggleGroup type="single" value={st} onValueChange={(v) => v && setSt(v)}>
              {['open', 'full', 'closed'].map((k) => <ToggleGroupItem key={k} value={k}>{W[k][1]}</ToggleGroupItem>)}
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-label">{tr('لمدة', 'For')}</span>
            <div className="grid grid-cols-2 gap-2">{opts.map(([m, l]) => <OButton key={l} variant="outline" size="sm" onClick={() => apply(m)}>{l}</OButton>)}</div>
          </div>
          <p className="text-caption text-muted-foreground">{ov.active ? tr('يحلّ محل الضبط الحالي. ', 'Replaces the current setting. ') : ''}{tr('بعدها تعود الحالة تلقائيًا حسب الحضور.', 'After that the state follows attendance again.')}</p>
        </PopoverContent>
      </Popover>
      {ov.active && <OButton variant="ghost" size="sm" onClick={() => ov.set(null)}><OX />{tr('إلغاء', 'Cancel')}</OButton>}
      {!INSIDE_HOURS && <span className="text-caption text-muted-foreground">{tr('متاح خلال ساعات العمل فقط', 'Only during opening hours')}</span>}
    </span>
  );
}

function SpaceSwitcher() {
  const [cur, setCur] = React.useState(O.spaces[0]);
  const head = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-label text-primary-foreground" aria-hidden="true">{cur.name[0]}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span lang="en" className="truncate text-label">{cur.name}</span>
        <span className="truncate text-caption text-muted-foreground">{cur.area}</span>
      </span>
    </>
  );
  if (!IS_OWNER) return <div className="flex w-full items-center gap-3 p-2">{head}</div>;
  return (
    <ODropdown dir={DIR}>
      <ODropdownTrigger asChild>
        <button type="button" className="flex w-full items-center gap-3 rounded-md p-2 text-start hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-label={tr('تبديل المساحة', 'Switch space') + ' — ' + cur.name}>
          {head}<ChevronsUpDownIcon className="size-4 text-muted-foreground" aria-hidden="true" />
        </button>
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

function OwnerUserMenu() {
  const u = STAFF;
  return (
    <ODropdown dir={DIR}>
      <ODropdownTrigger asChild>
        <OButton variant="ghost" size="sm" aria-label={tr('قائمة الحساب', 'Account menu') + ' — ' + u.name}>
          <OAvatar size="sm" aria-hidden="true"><OAvatarFallback>{u.name[0]}</OAvatarFallback></OAvatar><span className="hidden md:inline">{u.name}</span>
        </OButton>
      </ODropdownTrigger>
      <ODropdownContent align="end">
        <ODropdownLabel><span className="flex flex-col"><span>{u.name} · {u.role}</span><span dir="ltr" className="text-caption text-muted-foreground">{u.email}</span></span></ODropdownLabel>
        <ODropdownSep />
        <ODropdownItem onSelect={() => { location.href = carryParams('Home.html?auth=0'); }}><OLogOut />{tr('تسجيل الخروج', 'Sign out')}</ODropdownItem>
      </ODropdownContent>
    </ODropdown>
  );
}

// state: the automatic public state; a manual override turns it to Full while it runs.
function OwnerShell({ current, title, state = 'open', theme, setTheme, bottomAction, actions, children }) {
  const ov = useOverride();
  const base = INSIDE_HOURS ? state : 'closed';
  return (
    <SidebarProvider className="bg-background text-foreground">
      <Sidebar label={tr('لوحة إدارة المساحة', 'Space dashboard')}>
        <div className="sidebar-stick">
        <SidebarHeader><SpaceSwitcher /></SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {OWNER_NAV().map((n) => (
                <SidebarMenuItem key={n.id}>
                  <SidebarMenuButton href={roleQ(n.href)} icon={n.icon} label={n.label} isActive={current === n.id} badge={n.badge} badgeLabel={n.badge ? tr('بلاغات جديدة', 'new reports') : undefined} />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <OButton variant="ghost" className="w-full justify-start" asChild><a href="Space details.html?id=focus" target="_blank" rel="noopener" aria-label={tr('عرض الصفحة العامة', 'View public page')}><OEye /><span className="owner-collapse-hide">{tr('عرض الصفحة العامة', 'View public page')}</span></a></OButton>
        </SidebarFooter>
        </div>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-background px-4 py-2 md:px-8">
          <SidebarTrigger label={tr('القائمة', 'Menu')} />
          <h1 className="text-heading-3">{title}</h1>
          <span className="hidden items-center gap-2 lg:flex"><PublicStateBadge state={base} ov={ov} /><StatusControl ov={ov} /></span>
          <div className="ms-auto flex items-center gap-1">
            <OLang lang={LANG === 'en' ? 'ar' : 'en'} label={LANG === 'en' ? 'العربية' : 'English'} onClick={switchLang} className="hidden md:inline-flex" />
            <OTheme theme={theme} onThemeChange={setTheme} label={theme === 'light' ? tr('المظهر الداكن', 'Dark theme') : tr('المظهر الفاتح', 'Light theme')} />
            <OwnerUserMenu />
          </div>
          <span className="flex w-full flex-wrap items-center gap-2 lg:hidden"><PublicStateBadge state={base} ov={ov} /><StatusControl ov={ov} /></span>
        </header>
        <main className={'flex flex-1 flex-col gap-6 px-4 py-6 md:px-8 ' + (bottomAction ? 'pb-28 md:pb-6' : '')}>
          {actions && <div className="hidden flex-wrap justify-end gap-2 md:flex">{actions}</div>}
          {children}
        </main>
        {bottomAction && <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t border-border bg-background px-4 py-3 md:hidden">{bottomAction}</div>}
      </SidebarInset>
      <PageToaster />
    </SidebarProvider>
  );
}

// Numbers and ratios stay LTR and isolated inside Arabic text ("27 / 40").
const Num = ({ children }) => { const f = [].concat(children); const text = f.every((c) => typeof c === 'string' || typeof c === 'number'); return <span dir="ltr" className="num-iso">{text ? f.join('') : children}</span>; };
Object.assign(window, { OwnerShell, PublicStateBadge, publicState, Num, ROLE, IS_OWNER, roleQ, STAFF });
