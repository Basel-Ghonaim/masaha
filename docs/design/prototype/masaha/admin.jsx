const { SidebarProvider: ASP, Sidebar: ASidebar, SidebarHeader: ASHeader, SidebarContent: ASContent, SidebarGroup: ASGroup, SidebarMenu: ASMenu, SidebarMenuItem: ASItem, SidebarMenuButton: ASButton, SidebarInset: ASInset, SidebarTrigger: ASTrigger, DropdownMenu: ADd, DropdownMenuTrigger: ADdT, DropdownMenuContent: ADdC, DropdownMenuItem: ADdI, DropdownMenuLabel: ADdL, DropdownMenuSeparator: ADdS, Avatar: AAv, AvatarFallback: AAvF, Button: AB, Badge: ABadge, LanguageToggle: ALang, ThemeToggle: ATheme, InfoIcon: AInfo, EyeIcon: AEye, UsersIcon: AUsers, ChevronsUpDownIcon: AChev, TriangleAlertIcon: ATri, SearchIcon: ASearch, CalendarIcon: ACal, EllipsisIcon: AEll, LogOutIcon: ALogOut } = window.MasahaDesignSystem;
const AD = window.ADMIN;

const ADMIN_NAV = () => [
  { id: 'overview', label: tr('نظرة عامة', 'Overview'), href: 'Admin overview.html', icon: <AInfo /> },
  { id: 'spaces', label: tr('المساحات', 'Spaces'), href: 'Admin spaces.html', icon: <AEye /> },
  { id: 'owners', label: tr('أصحاب المساحات', 'Space owners'), href: 'Admin owners.html', icon: <AChev /> },
  { id: 'reports', label: tr('بلاغات البيانات', 'Data reports'), href: 'Admin reports.html', icon: <ATri />, badge: AD.reports.filter((r) => r.status === 'new' && AD.handledBy(r) === 'admin').length },
  { id: 'users', label: tr('المستخدمون', 'Users'), href: 'Admin users.html', icon: <AUsers /> },
  { id: 'lookups', label: tr('القوائم', 'Lookups'), href: 'Admin lookups.html', icon: <ASearch /> },
  { id: 'audit', label: tr('سجل التدقيق', 'Audit log'), href: 'Admin audit.html', icon: <ACal /> },
  { id: 'settings', label: tr('الإعدادات', 'Settings'), href: 'Admin settings.html', icon: <AEll /> }
];

function AdminShell({ current, title, theme, setTheme, actions, children }) {
  const u = AD.admin;
  return (
    <ASP className="bg-background text-foreground">
      <ASidebar label={tr('لوحة إدارة المنصة', 'Platform admin')}>
        <div className="sidebar-stick">
          <ASHeader>
            <div className="flex w-full items-center gap-3 p-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-label text-primary-foreground" aria-hidden="true">{tr('م', 'M')}</span>
              <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-label">{tr('مساحة', 'Masaha')}</span><span className="truncate text-caption text-muted-foreground">{tr('إدارة المنصة', 'Platform admin')}</span></span>
            </div>
          </ASHeader>
          <ASContent>
            <ASGroup>
              <ASMenu>
                {ADMIN_NAV().map((n) => (
                  <ASItem key={n.id}><ASButton href={n.href} icon={n.icon} label={n.label} isActive={current === n.id} badge={n.badge || undefined} badgeLabel={n.badge ? tr('بلاغات بانتظار الإدارة', 'reports waiting for the admin') : undefined} /></ASItem>
                ))}
              </ASMenu>
            </ASGroup>
          </ASContent>
        </div>
      </ASidebar>
      <ASInset>
        <header className="sticky top-0 z-10 flex min-h-14 items-center gap-3 border-b border-border bg-background px-4 py-2 md:px-8">
          <ASTrigger label={tr('القائمة', 'Menu')} />
          <h1 className="text-heading-3">{title}</h1>
          <div className="ms-auto flex items-center gap-1">
            <ALang lang={LANG === 'en' ? 'ar' : 'en'} label={LANG === 'en' ? 'العربية' : 'English'} onClick={switchLang} className="hidden md:inline-flex" />
            <ATheme theme={theme} onThemeChange={setTheme} label={theme === 'light' ? tr('المظهر الداكن', 'Dark theme') : tr('المظهر الفاتح', 'Light theme')} />
            <ADd dir={DIR}>
              <ADdT asChild><AB variant="ghost" size="sm" aria-label={tr('قائمة الحساب', 'Account menu') + ' — ' + u.name}><AAv size="sm" aria-hidden="true"><AAvF>{u.name[0]}</AAvF></AAv><span className="hidden md:inline">{u.name}</span></AB></ADdT>
              <ADdC align="end">
                <ADdL><span className="flex flex-col"><span>{u.name} · {tr('أدمن', 'Admin')}</span><span dir="ltr" className="text-caption text-muted-foreground">{u.email}</span></span></ADdL>
                <ADdS />
                <ADdI onSelect={() => { location.href = carryParams('Home.html?auth=0'); }}><ALogOut />{tr('تسجيل الخروج', 'Sign out')}</ADdI>
              </ADdC>
            </ADd>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-8">
          {actions && <div className="hidden flex-wrap justify-end gap-2 md:flex">{actions}</div>}
          {children}
        </main>
      </ASInset>
      <PageToaster />
    </ASP>
  );
}

const PrivacyNote = () => <p className="rounded-lg bg-muted p-3 text-body-sm text-muted-foreground">{tr('بيانات تشغيل المساحة خاصة بإدارتها', 'A space’s operating data is private to its management')} — {tr('الزبائن والزيارات والاشتراكات والدفعات والمالية.', 'customers, visits, memberships, payments and finance.')}</p>;
const SpaceStatus = ({ s }) => { const [l, v] = AD.STATUS[s.status]; return <ABadge variant={v}>{l}</ABadge>; };
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
