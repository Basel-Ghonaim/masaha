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

// A4: one way to link an owner, from either end. From a space the admin chooses one person,
// from a person one space; both say what the link will do before it is made. Admins and
// suspended accounts are refused by the API, so they are never offered.
const liveSpaces = (ids, spaces) => ids.filter((id) => { const s = spaces.find((x) => x.id === id); return s && !s.deleted; });
const personName = (id, users) => (users.find((u) => u.id === id) || {}).name;
function LinkOwnerDialog({ space, person, users = AD.users, spaces = AD.spaces, onClose, onLinked }) {
  const { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button, Field, Combobox, ComboboxTrigger, ComboboxContent, ComboboxItem, Alert, AlertTitle, AlertDescription, toast } = window.MasahaDesignSystem;
  const open = !!(space || person);
  const [pick, setPick] = React.useState('');
  const [err, setErr] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { setPick(''); setErr(null); setFailed(false); }, [space, person]);
  if (!open) return <Dialog open={false}><DialogContent /></Dialog>;
  const fromSpace = !!space;
  const s = fromSpace ? space : spaces.find((x) => x.id === pick);
  const u = fromSpace ? users.find((x) => x.id === pick) : person;
  const spaceNames = (x) => liveSpaces(x.spaces, spaces).map((id) => spaces.find((y) => y.id === id).name).join(tr('، ', ', '));
  const kind = (x) => (x.role === 'owner' ? tr('مالك', 'Owner') + (spaceNames(x) ? ' · ' + spaceNames(x) : '') : tr('مستخدم', 'User'));
  const people = users.filter((x) => x.role !== 'admin' && x.status === 'active');
  const choices = spaces.filter((x) => !x.deleted);
  // The consequence, in the words the confirmation uses: what happens to the space, then to the person.
  const lines = [];
  if (s) lines.push(s.status === 'verified' ? tr(`يصبح مالكًا آخر لـ ${s.name}؛ تبقى موثّقة.`, `They become another owner of ${s.name}; it stays verified.`) : tr(`تصبح ${s.name} موثّقة ويعدّلها مالكها، ولا يعدّلها فريق مساحة بعد الآن.`, `${s.name} becomes verified and its owner edits it; the Masaha team no longer does.`));
  if (u && u.role === 'user') lines.push(tr('ويصبح حسابه حساب مالك، ويُطلب منه الدخول من جديد.', 'Their account becomes an owner’s, and they’re asked to sign in again.'));
  const submit = () => {
    if (!pick) { setErr(fromSpace ? tr('اختر شخصًا', 'Choose a person') : tr('اختر مساحة', 'Choose a space')); return; }
    setErr(null); setBusy(true);
    setTimeout(() => {
      setBusy(false);
      // `?fail=link`: the person has an active reception link at this space (RECEPTION_LINK_ACTIVE),
      // which the admin's list cannot show beforehand (DI-24).
      if (actionFails('link')) { setFailed(true); return; }
      onLinked(u.id, s.id);
      toast.success(tr(`رُبط ${u.name} بـ ${s.name}`, `${u.name} linked to ${s.name}`), { description: s.status === 'verified' ? undefined : tr('المساحة موثّقة الآن', 'The space is now verified') });
      onClose();
    }, ACTION_MS);
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent closeLabel={tr('إغلاق', 'Close')}>
        <DialogHeader>
          <DialogTitle>{fromSpace ? <>{tr('ربط مالك بـ ', 'Link an owner to ')}<span lang="en">{space.name}</span></> : tr(`ربط ${person.name} بمساحة`, `Link ${person.name} to a space`)}</DialogTitle>
          <DialogDescription>{fromSpace ? (space.owners.length ? tr('مالكها اليوم: ', 'Its owner today: ') + space.owners.map((id) => personName(id, users)).join(tr('، ', ', ')) : tr('ليس لها مالك اليوم.', 'It has no owner today.')) : tr('مساحة واحدة في كل مرة.', 'One space at a time.')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {failed && <Alert variant="destructive"><AlertTitle>{tr('لم يُربط', 'Not linked')}</AlertTitle><AlertDescription>{tr('لهذا الشخص رابط استقبال في هذه المساحة؛ يفكّه مالكها أولًا.', 'This person has a reception link at this space; its owner ends it first.')}</AlertDescription></Alert>}
          <Field label={fromSpace ? tr('الشخص', 'Person') : tr('المساحة', 'Space')} helper={fromSpace ? tr('المالكون والمستخدمون، بالاسم أو البريد. الحسابات الموقوفة لا تُربط.', 'Owners and users, by name or email. Suspended accounts can’t be linked.') : undefined} error={err}>
            <Combobox type="single" value={pick} onValueChange={(v) => { setPick(v); setErr(null); setFailed(false); }}>
              <ComboboxTrigger empty={!pick}>{fromSpace ? (u ? u.name : tr('اختر شخصًا', 'Choose a person')) : (s ? <span lang="en">{s.name}</span> : tr('اختر مساحة', 'Choose a space'))}</ComboboxTrigger>
              <ComboboxContent searchLabel={tr('بحث', 'Search')} searchPlaceholder={fromSpace ? tr('الاسم أو البريد', 'Name or email') : tr('اسم المساحة', 'Space name')} listLabel={fromSpace ? tr('الأشخاص', 'People') : tr('المساحات', 'Spaces')} emptyText={tr('لا نتائج', 'No results')}>
                {fromSpace ? people.map((x) => {
                  const mine = space.owners.includes(x.id);
                  return (
                    <ComboboxItem key={x.id} value={x.id} keywords={[x.name, x.email]} disabled={mine}>
                      <span className="flex min-w-0 flex-col"><span>{x.name}</span><span className="text-caption text-muted-foreground"><Ltr>{x.email}</Ltr> · {mine ? tr('مالكها', 'Its owner') : kind(x)}</span></span>
                    </ComboboxItem>
                  );
                }) : choices.map((x) => {
                  const mine = person.spaces.includes(x.id);
                  return (
                    <ComboboxItem key={x.id} value={x.id} keywords={[x.name]} disabled={mine}>
                      <span className="flex min-w-0 flex-col gap-1"><span lang="en">{x.name}</span><span className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground"><SpaceStatus s={x} />{mine ? tr('مربوطة', 'Linked') : x.owners.length ? x.owners.map((id) => personName(id, users)).join(tr('، ', ', ')) : tr('بلا مالك', 'No owner')}</span></span>
                    </ComboboxItem>
                  );
                })}
              </ComboboxContent>
            </Combobox>
          </Field>
          {lines.length > 0 && <p className="text-body-sm" aria-live="polite">{lines.join(' ')}</p>}
          {fromSpace && <p className="text-caption text-muted-foreground">{tr('مالك جديد بلا حساب؟ أضفه من ', 'A new owner with no account? Add them in ')}<a href="Admin owners.html?sheet=add">{tr('أصحاب المساحات', 'Space owners')}</a>.</p>}
        </div>
        <DialogFooter><Button loading={busy} onClick={submit}>{tr('ربط', 'Link')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// A4: ending a link says what it does, to the space and to the person, before it is done.
// The person's role follows every owner link, a deleted space's included (finding 50).
function unlinkLine(space, owners, person) {
  const out = [owners.length === 1
    ? tr(`تصبح ${space.name} غير موثّقة وتختفي حالتها المباشرة، ويعدّلها فريق مساحة.`, `${space.name} becomes unverified, its live status disappears, and the Masaha team edits it.`)
    : tr('يبقى المالكون الآخرون، وتبقى موثّقة.', 'The other owners stay, and it stays verified.')];
  if (person && person.spaces.length === 1) out.push(tr(`ولا يبقى ${person.name} مالكًا، فيُطلب منه الدخول من جديد.`, `${person.name} is no longer an owner, and is asked to sign in again.`));
  return out.join(' ');
}
Object.assign(window, { AdminShell, PrivacyNote, SpaceStatus, Num, TempPassDialog, tempPass, LinkOwnerDialog, liveSpaces, personName, unlinkLine });
