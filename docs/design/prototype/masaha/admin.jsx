const { SidebarProvider: ASP, Sidebar: ASidebar, SidebarHeader: ASHeader, SidebarContent: ASContent, SidebarFooter: ASFooter, SidebarGroup: ASGroup, SidebarGroupLabel: ASGroupLabel, SidebarMenu: ASMenu, SidebarMenuItem: ASItem, SidebarMenuButton: ASButton, SidebarInset: ASInset, SidebarTrigger: ASTrigger, DropdownMenu: ADd, DropdownMenuTrigger: ADdT, DropdownMenuContent: ADdC, DropdownMenuItem: ADdI, DropdownMenuLabel: ADdL, DropdownMenuSeparator: ADdS, Tooltip: ATip, TooltipTrigger: ATipT, TooltipContent: ATipC, Avatar: AAv, AvatarFallback: AAvF, Button: AB, Badge: ABadge, LanguageToggle: ALang, ThemeToggle: ATheme, InfoIcon: AInfo, EyeIcon: AEye, UsersIcon: AUsers, ChevronsUpDownIcon: AChev, TriangleAlertIcon: ATri, SearchIcon: ASearch, CalendarIcon: ACal, EllipsisIcon: AEll, LogOutIcon: ALogOut } = window.MasahaDesignSystem;
const AD = window.ADMIN;

// P3: the spaces the platform lists, then the platform itself.
const ADMIN_NAV = () => [
  { items: [{ id: 'overview', label: tr('نظرة عامة', 'Overview'), href: 'Admin overview.html', icon: <AInfo /> }] },
  { label: tr('المساحات', 'Spaces'), items: [
    { id: 'spaces', label: tr('المساحات', 'Spaces'), href: 'Admin spaces.html', icon: <AEye /> },
    { id: 'owners', label: tr('أصحاب المساحات', 'Space owners'), href: 'Admin owners.html', icon: <AChev /> },
    { id: 'reports', label: tr('بلاغات البيانات', 'Data reports'), href: 'Admin reports.html', icon: <ATri />, badge: AD.reports.filter((r) => r.status === 'new' && AD.handledBy(r) === 'admin').length }
  ] },
  { label: tr('المنصة', 'The platform'), items: [
    { id: 'users', label: tr('المستخدمون', 'Users'), href: 'Admin users.html', icon: <AUsers /> },
    { id: 'lookups', label: tr('القوائم', 'Lookups'), href: 'Admin lookups.html', icon: <ASearch /> },
    { id: 'audit', label: tr('سجل التدقيق', 'Audit log'), href: 'Admin audit.html', icon: <ACal /> },
    { id: 'settings', label: tr('الإعدادات', 'Settings'), href: 'Admin settings.html', icon: <AEll /> }
  ] }
];

// SH-006: the platform's mark stays on the 768 rail, as the space's does in the owner's shell.
const AdminMark = () => (
  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-label text-primary-foreground" aria-hidden="true">{tr('م', 'M')}</span>
);

function AdminShell({ current, title, theme, setTheme, actions, loadError, children }) {
  const u = AD.admin;
  const rail = useIsTablet() && !useIsDesktop();
    const route = routeState();
      const failed = pageParams.get('state') === 'error';
  const brand = tr('مساحة — إدارة المنصة', 'Masaha — platform admin');
  return (
    <ASP className="bg-background text-foreground">
      <SkipLink />
      <ASidebar label={tr('لوحة إدارة المنصة', 'Platform admin')}>
        <div className="sidebar-stick">
          <ASHeader mark={rail ? <ATip><ATipT asChild><span><AdminMark /></span></ATipT><ATipC>{brand}</ATipC></ATip> : <AdminMark />}>
            <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-label">{tr('مساحة', 'Masaha')}</span><span className="truncate text-caption text-muted-foreground">{tr('إدارة المنصة', 'Platform admin')}</span></span>
          </ASHeader>
          <ASContent>
            {ADMIN_NAV().map((g, i) => (
              <ASGroup key={g.label || i}>
                {g.label && <ASGroupLabel>{g.label}</ASGroupLabel>}
                <ASMenu>
                  {g.items.map((n) => (
                    <ASItem key={n.id}><ASButton href={n.href} icon={n.icon} label={n.label} isActive={current === n.id} badge={n.badge || undefined} badgeLabel={n.badge ? tr('بلاغات بانتظار الإدارة', 'reports waiting for the admin') : undefined} /></ASItem>
                  ))}
                </ASMenu>
              </ASGroup>
            ))}
          </ASContent>
          <ASFooter>
            {/* SH-005: a phone has no room for the toggles in the bar, so the drawer's foot carries both. */}
            <div className="flex items-center gap-1 md:hidden">
              <ALang lang={LANG === 'en' ? 'ar' : 'en'} label={LANG === 'en' ? 'العربية' : 'English'} onClick={switchLang} />
              <ATheme theme={theme} onThemeChange={setTheme} label={theme === 'light' ? tr('المظهر الداكن', 'Dark theme') : tr('المظهر الفاتح', 'Light theme')} />
            </div>
          </ASFooter>
        </div>
      </ASidebar>
      <ASInset>
        <header className="sticky top-0 z-10 flex min-h-14 flex-wrap items-center gap-x-2 gap-y-2 border-b border-border bg-background px-4 py-2 md:gap-x-3 md:px-8">
          <ASTrigger label={tr('القائمة', 'Menu')} />
          <h1 className="min-w-0 flex-1 truncate text-heading-3">{title}</h1>
          <PageActions actions={actions} />
          <div className="ms-auto flex items-center gap-1">
            <ALang lang={LANG === 'en' ? 'ar' : 'en'} label={LANG === 'en' ? 'العربية' : 'English'} onClick={switchLang} className="hidden md:inline-flex" />
            <ATheme theme={theme} onThemeChange={setTheme} label={theme === 'light' ? tr('المظهر الداكن', 'Dark theme') : tr('المظهر الفاتح', 'Light theme')} className="hidden md:inline-flex" />
            <ADd dir={DIR}>
              <ADdT asChild><AB variant="ghost" size="sm" aria-label={tr('قائمة الحساب', 'Account menu') + ' — ' + u.name}><AAv size="sm" aria-hidden="true"><AAvF>{u.name[0]}</AAvF></AAv><span className="hidden md:inline-flex">{u.name}</span></AB></ADdT>
              <AccountMenuContent
                user={{ ...u, role: tr('أدمن', 'Admin') }}
                area="dashboard"
                theme={theme}
                setTheme={setTheme}
                onSignOut={() => { location.href = carryParams('Home.html?auth=0'); }}
              />
            </ADd>
          </div>
        </header>
        <main id="main" className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-8">
          {route ? <RouteState state={route} /> : failed ? <LoadError what={loadError} /> : children}
        </main>
      </ASInset>
      <PageToaster />
    </ASP>
  );
}

const PrivacyNote = () => <p className="rounded-lg bg-muted p-3 text-body-sm text-muted-foreground">{tr('بيانات تشغيل المساحة خاصة بإدارتها', 'A space’s operating data is private to its management')} — {tr('الزبائن والزيارات والاشتراكات والدفعات والمالية.', 'customers, visits, subscriptions, payments and finance.')}</p>;
// A3: a space's state is two facts — the verification always, «مخفية» beside it when hidden.
const SpaceStatus = ({ s }) => { const [l, v] = AD.STATUS[s.status]; return <span className="inline-flex flex-wrap items-center gap-2"><ABadge variant={v}>{l}</ABadge>{s.hidden && <ABadge variant="warning">{tr('مخفية', 'Hidden')}</ABadge>}</span>; };
const Num = ({ children }) => { const f = [].concat(children); const text = f.every((c) => typeof c === 'string' || typeof c === 'number'); return <span dir="ltr" className="num-iso">{text ? f.join('') : children}</span>; };
// Shared once-only temporary password dialog.
function TempPassDialog({ info, onClose, line }) {
  const { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button, CheckIcon } = window.MasahaDesignSystem;
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => setCopied(false), [info]);
  return (
    <Dialog open={!!info} onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tr('إغلاق', 'Close')}>
        <DialogHeader><DialogTitle>{tr('كلمة المرور المؤقتة', 'Temporary password')}</DialogTitle>{info && <DialogDescription>{info.name} · <span dir="ltr">{info.email}</span></DialogDescription>}</DialogHeader>
        {info && <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted p-3"><span dir="ltr" className="text-heading-3">{info.pw}</span><Button size="sm" variant="outline" onClick={() => { try { navigator.clipboard.writeText(info.pw); } catch (e) {} setCopied(true); }}>{copied ? <><CheckIcon />{tr('نُسخت', 'Copied')}</> : tr('نسخ', 'Copy')}</Button></div>
          <p className="text-body-sm">{line}</p>
          <p className="text-caption text-muted-foreground">{tr('لن تظهر مرة أخرى بعد إغلاق هذه النافذة.', 'It won’t be shown again after you close this window.')}</p>
        </div>}
        <DialogFooter><Button onClick={onClose}>{tr('تم', 'Done')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
const tempPass = () => 'Msh-' + Math.random().toString(36).slice(2, 6) + '-' + (100 + Math.floor(Math.random() * 900));
Object.assign(window, { AdminShell, PrivacyNote, SpaceStatus, Num, TempPassDialog, tempPass });
