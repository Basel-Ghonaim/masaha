const { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetBody, Button, Badge, Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter, Skeleton, LanguageToggle, ThemeToggle, MenuIcon, LogInIcon, LogOutIcon, CircleCheckIcon } = window.MasahaDesignSystem;
const M = window.MASAHA;
const pageParams = new URLSearchParams(location.search);

function useTheme() {
  const [theme, setTheme] = React.useState(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  React.useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  return [theme, setTheme];
}

function useIsDesktop() {
  const q = '(min-width: 1024px)';
  const [on, setOn] = React.useState(() => matchMedia(q).matches);
  React.useEffect(() => { const m = matchMedia(q); const h = () => setOn(m.matches); m.addEventListener('change', h); return () => m.removeEventListener('change', h); }, []);
  return on;
}

// Location never leaves the device: kept in this tab only, used to sort and measure.
const GAZA_STRIP = { north: 31.60, south: 31.22, west: 34.20, east: 34.57 };
const MAX_ACCURACY_M = 2000;
const LOC_KEY = 'masaha:near-me';
function initialLoc() {
  const p = pageParams.get('loc');
  if (p === 'granted') return { status: 'granted', source: 'gps', coords: M.demoUser };
  if (p === 'manual') return { status: 'granted', source: 'manual', coords: { lat: 31.5262, lng: 34.4500 } };
  if (p === 'denied' || p === 'imprecise' || p === 'picking' || p === 'locating') return { status: p };
  if (p) return { status: 'idle' };
  if (pageParams.get('pick') === '1') return { status: 'picking' };
  try { const s = JSON.parse(sessionStorage.getItem(LOC_KEY)); if (s && s.coords) return s; } catch (e) {}
  return { status: 'idle' };
}
function useNearMe() {
  const [loc, setLoc] = React.useState(initialLoc);
  React.useEffect(() => {
    if (pageParams.get('loc')) return;
    try { loc.status === 'granted' ? sessionStorage.setItem(LOC_KEY, JSON.stringify(loc)) : loc.status === 'idle' && sessionStorage.removeItem(LOC_KEY); } catch (e) {}
  }, [loc]);
  const request = React.useCallback(() => {
    if (!navigator.geolocation) return setLoc({ status: 'denied' });
    setLoc({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const c = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
        const b = GAZA_STRIP, inside = c.lat < b.north && c.lat > b.south && c.lng > b.west && c.lng < b.east;
        setLoc(inside && c.accuracy <= MAX_ACCURACY_M ? { status: 'granted', source: 'gps', coords: c } : { status: 'imprecise' });
      },
      () => setLoc({ status: 'denied' }),
      { timeout: 8000, maximumAge: 300000, enableHighAccuracy: true }
    );
  }, []);
  const startPick = React.useCallback(() => setLoc({ status: 'picking' }), []);
  const placePin = React.useCallback((coords) => setLoc({ status: 'granted', source: 'manual', coords }), []);
  const clear = React.useCallback(() => setLoc({ status: 'idle' }), []);
  React.useEffect(() => { if (pageParams.get('near') === '1' && !pageParams.get('loc') && loc.status === 'idle') request(); }, []);
  return { loc, coords: loc.status === 'granted' ? loc.coords : null, request, startPick, placePin, clear };
}

// SH-007 (and DI-7): an always-LTR value never breaks mid-number inside Arabic text.
const Ltr = ({ children }) => <span dir="ltr" className="num-iso">{children}</span>;
const Money = ({ amount }) => <Ltr>{LANG === 'en' ? `₪${amount}` : `${amount} ₪`}</Ltr>;
const fmtKm = (km) => (km < 10 ? km.toFixed(1) : Math.round(km)).toString();
const Distance = ({ km }) => <span>{tr("على بعد ", "About ")}<Ltr>{fmtKm(km)}</Ltr>{tr(" كم تقريبًا", " km away")}</span>;
const spaceHref = (s) => `Space details.html?id=${s.id}`;
const locPass = () => (pageParams.get('loc') === 'granted' ? '&loc=granted' : '');

// Signed-in user (demo): sessionStorage after sign-in, or ?auth=1 | google | linked for board frames.
const USER_KEY = 'masaha:user';
const DEMO_USER = { name: tr('سارة أحمد', 'Sara Ahmad'), email: 'sara@example.com' };
function getUser() {
  const a = pageParams.get('auth');
  if (a === '0') return null;
  if (a) return { ...DEMO_USER, method: a === 'google' ? 'google' : a === 'linked' ? 'linked' : 'email' };
  try { return JSON.parse(sessionStorage.getItem(USER_KEY)); } catch (e) { return null; }
}
const setUser = (u) => { try { u ? sessionStorage.setItem(USER_KEY, JSON.stringify(u)) : sessionStorage.removeItem(USER_KEY); } catch (e) {} };
const signOut = () => { setUser(null); location.href = carryParams('Home.html?auth=0'); };
const firstName = (u) => u.name.trim().split(' ')[0];
const ACCOUNT_LINKS = () => [
  { id: 'favorites', label: tr('المفضّلة', 'Favourites'), href: 'Favorites.html' },
  { id: 'reports', label: tr('بلاغاتي', 'My reports'), href: 'Reports.html' }
];
// The dashboard a user can reach. The demo user is a plain user unless ?auth=linked.
const dashboardHref = (user) => (user && user.method === 'linked' ? 'Owner overview.html' : null);
const authQ = () => (pageParams.get('auth') ? '?auth=' + pageParams.get('auth') : '');

// P4: the one account menu. `area` is the side it is opened from, so it offers the other one.
// On a phone in the dashboard it also carries the theme and the language, which the bar has no room for.
function AccountMenuContent({ user, current, area = 'site', onSignOut, theme, setTheme }) {
  const { DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } = window.MasahaDesignSystem;
  const dash = dashboardHref(user);
  const onPhone = !useIsTablet();
  return (
    <DropdownMenuContent align="end" className="min-w-56">
      <DropdownMenuLabel>
        <span className="flex flex-col">
          <span>{user.name}{user.role ? ' · ' + user.role : ''}</span>
          <span dir="ltr" className="text-caption text-muted-foreground">{user.email}</span>
        </span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {area === 'site'
        ? dash && <DropdownMenuItem asChild><a href={dash}>{tr('لوحة التحكم', 'Dashboard')}</a></DropdownMenuItem>
        : <DropdownMenuItem asChild><a href="Home.html">{tr('الموقع العام', 'Public site')}</a></DropdownMenuItem>}
      <DropdownMenuItem asChild><a href={'Settings.html' + authQ()} aria-current={current === 'settings' ? 'page' : undefined}>{tr('إعدادات حسابي', 'Account settings')}</a></DropdownMenuItem>
      {area === 'site' && ACCOUNT_LINKS().map((l) => (
        <DropdownMenuItem key={l.id} asChild><a href={l.href + authQ()} aria-current={current === l.id ? 'page' : undefined}>{l.label}</a></DropdownMenuItem>
      ))}
      {area === 'dashboard' && onPhone && setTheme && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTheme(theme === 'light' ? 'dark' : 'light'); }}>
            {theme === 'light' ? tr('المظهر الداكن', 'Dark theme') : tr('المظهر الفاتح', 'Light theme')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={switchLang}>{LANG === 'en' ? 'العربية' : 'English'}</DropdownMenuItem>
        </>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={onSignOut || signOut}><LogOutIcon />{tr('تسجيل الخروج', 'Sign out')}</DropdownMenuItem>
    </DropdownMenuContent>
  );
}

// P1: the page's own actions, in one place. Secondary first, the primary last.
// From 768 they sit in the top bar beside the title; below it they fold into a «⋯» menu there.
// A list's "add" is not one of these: it belongs at the end of the row above its list.
function PageActions({ actions }) {
  const { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, EllipsisIcon } = window.MasahaDesignSystem;
  const wide = useIsTablet();
  // `bottom`: on a phone this action is the shell's fixed bottom bar, so it is not repeated here.
  const list = (actions || []).filter(Boolean).filter((a) => wide || !a.bottom);
  if (!list.length) return null;
  if (wide) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        {list.map((a) => (a.href
          ? <Button key={a.key} variant={a.variant || 'outline'} size="sm" asChild><a href={a.href}>{a.icon}{a.label}</a></Button>
          : <Button key={a.key} variant={a.variant || 'outline'} size="sm" onClick={a.onClick}>{a.icon}{a.label}</Button>))}
      </span>
    );
  }
  return (
    <DropdownMenu dir={DIR}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={tr('إجراءات الصفحة', 'Page actions')}><EllipsisIcon /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {list.map((a) => (a.href
          ? <DropdownMenuItem key={a.key} asChild><a href={a.href}>{a.icon}{a.label}</a></DropdownMenuItem>
          : <DropdownMenuItem key={a.key} onSelect={a.onClick}>{a.icon}{a.label}</DropdownMenuItem>))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// SH-018: the first focusable element of every shell, seen only once it has focus.
function SkipLink({ target = 'main' }) {
  return <Button variant="link" className="skip-link" asChild><a href={'#' + target}>{tr('تخطَّ إلى المحتوى', 'Skip to content')}</a></Button>;
}

function UserMenu({ user, current }) {
  const { DropdownMenu, DropdownMenuTrigger, Avatar, AvatarFallback } = window.MasahaDesignSystem;
  return (
    <DropdownMenu dir={DIR}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={tr('قائمة الحساب', 'Account menu') + ' — ' + user.name}>
          <Avatar size="sm" aria-hidden="true"><AvatarFallback>{user.name[0]}</AvatarFallback></Avatar>
          <span className="hidden md:inline-flex">{firstName(user)}</span>
        </Button>
      </DropdownMenuTrigger>
      <AccountMenuContent user={user} current={current} area="site" />
    </DropdownMenu>
  );
}

function SiteHeader({ current, theme, setTheme }) {
  const user = getUser();
  const links = [{ id: 'home', label: tr("الرئيسية", "Home"), href: 'Home.html' }, { id: 'directory', label: tr("المساحات", "Spaces"), href: 'Directory.html' }, { id: 'about', label: tr("عن مساحة", "About Masaha"), href: 'About.html' }];
  const themeLabel = theme === 'light' ? tr("المظهر الداكن", "Dark theme") : tr("المظهر الفاتح", "Light theme");
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 md:px-8">
        <SkipLink />
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label={tr("القائمة", "Menu")}><MenuIcon /></Button>
          </SheetTrigger>
          <SheetContent side="start" closeLabel={tr("إغلاق القائمة", "Close menu")} aria-describedby={undefined}>
            <SheetHeader><SheetTitle className="text-primary">{tr("مساحة", "Masaha")}</SheetTitle></SheetHeader>
            <SheetBody>
              <nav aria-label={tr("التنقل الرئيسي", "Main navigation")} className="flex flex-col gap-1">
                {links.map((l) => (
                  <Button key={l.id} variant={current === l.id ? 'secondary' : 'ghost'} className="w-full justify-start" asChild>
                    <a href={l.href} aria-current={current === l.id ? 'page' : undefined}>{l.label}</a>
                  </Button>
                ))}
                {!user && <Button variant="ghost" className="w-full justify-start" asChild><a href="Sign in.html"><LogInIcon />{tr("تسجيل الدخول", "Sign in")}</a></Button>}
              </nav>
            </SheetBody>
            {/* SH-005: the language stays in the header, where a non-Arabic reader sees it; the theme moves here. */}
            <div className="p-4"><ThemeToggle theme={theme} onThemeChange={setTheme} label={themeLabel} /></div>
          </SheetContent>
        </Sheet>
        <a href="Home.html" className="text-heading-3 text-primary">{tr("مساحة", "Masaha")}</a>
        <nav aria-label={tr("التنقل الرئيسي", "Main navigation")} className="ms-6 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Button key={l.id} variant="ghost" size="sm" className={current === l.id ? 'text-foreground' : 'text-muted-foreground'} asChild>
              <a href={l.href} aria-current={current === l.id ? 'page' : undefined}>{l.label}</a>
            </Button>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <LanguageToggle lang={LANG === 'en' ? 'ar' : 'en'} label={LANG === 'en' ? 'العربية' : 'English'} onClick={switchLang} />
          <ThemeToggle theme={theme} onThemeChange={setTheme} label={themeLabel} className="hidden md:inline-flex" />
          {user ? <UserMenu user={user} current={current} /> : <Button variant="outline" size="sm" className="hidden md:inline-flex" asChild><a href="Sign in.html"><LogInIcon />{tr("تسجيل الدخول", "Sign in")}</a></Button>}
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-body-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
        <p>{tr("مساحة — دليل مساحات العمل المشتركة في قطاع غزة", "Masaha — a directory of coworking spaces in the Gaza Strip")}</p>
        <div className="flex flex-wrap gap-4">
          <a href="About.html">{tr("عن مساحة", "About Masaha")}</a>
          <a href="About.html#owners">{tr("تواصل معنا", "Contact us")}</a>
        </div>
      </div>
    </footer>
  );
}

const statusWord = (s) => !s.verified ? tr("لا تتوفر حالة مباشرة", "No live status") : s.status === 'open' ? tr("متاح", "Available") : s.status === 'full' ? tr("ممتلئ", "Full") : tr("مغلق الآن", "Closed now");

function LiveStatus({ space }) {
  if (!space.verified) return <span className="text-body-sm text-muted-foreground">{tr("لا تتوفر حالة مباشرة", "No live status")}</span>;
  if (space.status === 'open') return <Badge variant="success">{tr("متاح", "Available")}</Badge>;
  if (space.status === 'full') return <Badge variant="warning">{tr("ممتلئ", "Full")}</Badge>;
  return <Badge variant="neutral">{tr("مغلق الآن", "Closed now")}</Badge>;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
function TodayHours({ space }) {
  const h = space.hours[DAY_KEYS[new Date().getDay()]];
  return h ? <span>{tr("اليوم ", "Today ")}<Ltr>{h[0]}–{h[1]}</Ltr></span> : <span>{tr("مغلقة اليوم", "Closed today")}</span>;
}

function SpacePrices({ space }) {
  if (M.priceHidden(space)) {
    return <p className="rounded-md bg-muted px-3 py-3 text-body-sm text-muted-foreground">{tr("السعر غير محدّث — تواصل مع المساحة", "Price not up to date — contact the space")}</p>;
  }
  // Fixed columns: ساعة · يوم · أسبوع · شهر on every card; a missing period is a quiet «—».
  const cells = M.periods.map((p) => ({ key: p.id, label: p.short, amount: space.prices[p.id] }));
  if (space.studentMonth) cells.push({ key: 'student', label: tr("شهر · طلاب", "Student month"), amount: space.studentMonth, wide: true });
  return (
    <dl className="grid grid-cols-4 gap-2">
      {cells.map((c) => c.amount == null ? (
        <div key={c.key} className="flex flex-col rounded-md border border-border px-2 py-1">
          <dt className="text-caption text-muted-foreground">{c.label}</dt>
          <dd className="text-label text-muted-foreground"><span aria-hidden="true">—</span><span className="sr-only">{tr("غير متوفر", "Not offered")}</span></dd>
        </div>
      ) : (
        <div key={c.key} className={'flex flex-col rounded-md bg-muted px-2 py-1' + (c.wide ? ' col-span-2' : '')}>
          <dt className="text-caption text-muted-foreground">{c.label}</dt>
          <dd className="text-label"><Money amount={c.amount} /></dd>
        </div>
      ))}
    </dl>
  );
}

function PriceMeta({ space }) {
  if (M.priceHidden(space)) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
      <span>{tr("للعرض فقط · الدفع في المساحة", "Display only · Pay at the space")}</span>
      <span>{tr("· آخر تحديث ", "· Updated ")}{space.updated}</span>
      {space.stale && <Badge variant="warning">{tr("قد يكون تغيّر", "May have changed")}</Badge>}
    </div>
  );
}

function SpaceMeta({ space, km }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
      <TodayHours space={space} />
      {km != null && <Distance km={km} />}
      {space.verified && <span className="inline-flex items-center gap-1 text-primary"><CircleCheckIcon className="size-4" aria-hidden="true" />{tr("موثّقة", "Verified")}</span>}
    </div>
  );
}

const areaLine = (s) => `${M.areaName(s.area)}${tr('، ', ', ')}${M.govShort(s.gov)}`;

// reserveEnd: the top-end corner holds an overlaid control (favourites heart), so the status moves under the title.
function SpaceCard({ space, km, reserveEnd }) {
  return (
    <a href={spaceHref(space)} className="block h-full rounded-xl text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
      <Card className="h-full transition-colors hover:bg-accent">
        <CardHeader className={reserveEnd ? 'pe-16' : undefined}>
          <CardTitle>{space.name}</CardTitle>
          <CardDescription>{areaLine(space)}</CardDescription>
          {reserveEnd ? <div className="pt-1"><LiveStatus space={space} /></div> : <CardAction><LiveStatus space={space} /></CardAction>}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <SpaceMeta space={space} km={km} />
          <SpacePrices space={space} />
        </CardContent>
        {!M.priceHidden(space) && <CardFooter><PriceMeta space={space} /></CardFooter>}
      </Card>
    </a>
  );
}

function SpaceCardSkeleton() {
  return (
    <Card aria-hidden="true">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-20" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <div className="grid grid-cols-4 gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
      </CardContent>
      <CardFooter><Skeleton className="h-3 w-48" /></CardFooter>
    </Card>
  );
}

// One Toaster per page; shows a toast handed over from the auth pages (or ?toast= for the board).
const TOAST_KEY = 'masaha:toast';
const DEMO_TOASTS = { welcome: tr("أهلًا سارة، تم إنشاء حسابك", "Welcome Sara, your account is ready"), linked: tr("ربطنا حساب Google بحسابك", "We linked your Google account to your account") };
function PageToaster() {
  const { Toaster, toast } = window.MasahaDesignSystem;
  React.useEffect(() => {
    let list = [];
    try { list = JSON.parse(sessionStorage.getItem(TOAST_KEY)) || []; sessionStorage.removeItem(TOAST_KEY); } catch (e) {}
    const demo = pageParams.get('toast');
    if (demo) list = demo.split(',').map((k) => DEMO_TOASTS[k]).filter(Boolean);
    list.forEach((m, i) => setTimeout(() => toast.success(m, { duration: demo ? Infinity : 5000 }), 300 + i * 150));
  }, []);
  return <Toaster label={tr("الإشعارات", "Notifications")} closeLabel={tr("إغلاق الإشعار", "Close notification")} position="bottom-center" />;
}
const handOffToast = (...msgs) => { try { sessionStorage.setItem(TOAST_KEY, JSON.stringify(msgs)); } catch (e) {} };

const PRIVACY_LINE = tr("يبقى موقعك على جهازك فقط، ولا يُرسَل إلى أي جهة.", "Your location stays on your device and is never sent anywhere.");

Object.assign(window, { AccountMenuContent, PageActions, SkipLink, dashboardHref, getUser, setUser, signOut, firstName, authQ, DEMO_USER, useTheme, useIsDesktop, useNearMe, GAZA_STRIP, pageParams, Ltr, Money, Distance, fmtKm, spaceHref, locPass, SiteHeader, SiteFooter, statusWord, LiveStatus, TodayHours, SpacePrices, PriceMeta, SpaceMeta, areaLine, SpaceCard, SpaceCardSkeleton, PRIVACY_LINE, PageToaster, handOffToast });

// DS date picker with long localized dates («3 أكتوبر 2026»). value/onChange use ISO yyyy-mm-dd.
const isoLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const longDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString(tr('ar-EG', 'en-GB'), { day: 'numeric', month: 'long', year: 'numeric', numberingSystem: 'latn' });
function DateField({ value, onChange, disabled, label, error, helper, labelEnd, placeholder }) {
  const { Field, DatePicker, DatePickerTrigger, DatePickerContent, Calendar } = window.MasahaDesignSystem;
  const [open, setOpen] = React.useState(false);
  const d = value ? new Date(value + 'T12:00:00') : undefined;
  return (
    <Field label={label} error={error} helper={helper} labelEnd={labelEnd}>
      <DatePicker open={open} onOpenChange={(o) => !disabled && setOpen(o)}>
        <DatePickerTrigger empty={!d} disabled={disabled}>{d ? longDate(value) : placeholder || tr('اختر التاريخ', 'Choose a date')}</DatePickerTrigger>
        <DatePickerContent>
          <Calendar mode="single" lang={LANG} selected={d} defaultMonth={d} onSelect={(x) => { if (x) { onChange(isoLocal(x)); setOpen(false); } }} previousMonthLabel={tr('الشهر السابق', 'Previous month')} nextMonthLabel={tr('الشهر التالي', 'Next month')} />
        </DatePickerContent>
      </DatePicker>
    </Field>
  );
}
Object.assign(window, { DateField, longDate, isoLocal });

// 24-hour time on the DS Input: typed digits become HH:MM, clamped on blur. No AM/PM, no native picker.
function TimeInput({ value, onChange, ...p }) {
  const { Input } = window.MasahaDesignSystem;
  const [txt, setTxt] = React.useState(value || '');
  React.useEffect(() => setTxt(value || ''), [value]);
  const fmt = (raw) => { const d = raw.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + ':' + d.slice(2) : d; };
  const commit = () => {
    const d = txt.replace(/\D/g, ''); if (!d) return;
    let h = Number(d.length <= 2 ? d : d.slice(0, d.length - 2)), m = Number(d.length <= 2 ? 0 : d.slice(-2));
    h = Math.min(23, h); m = Math.min(59, m);
    const v = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); setTxt(v); onChange(v);
  };
  return <Input {...p} type="text" inputMode="numeric" dir="ltr" placeholder="08:00" maxLength={5} value={txt} onChange={(e) => { const v = fmt(e.target.value); setTxt(v); if (/^\d{2}:\d{2}$/.test(v)) onChange(v); }} onBlur={commit} />;
}

// Filters inline from 768px; on phones a «الفلاتر» button opens them in a bottom sheet.
function useIsTablet() {
  const q = '(min-width: 768px)';
  const [on, setOn] = React.useState(() => matchMedia(q).matches);
  React.useEffect(() => { const m = matchMedia(q); const h = () => setOn(m.matches); m.addEventListener('change', h); return () => m.removeEventListener('change', h); }, []);
  return on;
}
// P5: the one filter bar. `at` is where the filters go inline — 768 everywhere, except the
// Directory, which keeps the desktop sidebar it already had and so switches at 1024.
// The footer is the Directory's: the primary says how many results, the ghost clears.
function FilterSheet({ children, active = 0, onClear, count, at = 'md', always = false, description, open: openProp, onOpenChange }) {
  const { Button, Badge, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter } = window.MasahaDesignSystem;
    const desktop = useIsDesktop();
  const tablet = useIsTablet();
  const wide = (at === 'lg' ? desktop : tablet) && !always;
  const [ownOpen, setOwnOpen] = React.useState(pageParams.get('sheet') === 'filters');
    const open = openProp === undefined ? ownOpen : openProp;
    const setOpen = onOpenChange || setOwnOpen;
    if (wide) return children;
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>{tr('الفلاتر', 'Filters')}{active > 0 && <Badge variant="primary"><span dir="ltr">{active}</span></Badge>}</Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" closeLabel={tr('إغلاق', 'Close')}>
          <SheetHeader><SheetTitle>{tr('الفلاتر', 'Filters')}</SheetTitle>{description && <SheetDescription>{description}</SheetDescription>}</SheetHeader>
          <SheetBody className="flex flex-col gap-4 py-2">{children}</SheetBody>
          <SheetFooter className="flex flex-col gap-2">
            <Button size="lg" className="w-full" onClick={() => setOpen(false)}>{count === undefined ? tr('عرض النتائج', 'Show results') : resultsLabel(count)}</Button>
            {onClear && <Button variant="ghost" className="w-full" disabled={active === 0} onClick={onClear}>{tr('مسح الفلاتر', 'Clear filters')}</Button>}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
const resultsLabel = (n) => tr(`عرض ${n} نتيجة`, `Show ${n} result${n === 1 ? '' : 's'}`);

// P5: the result count belongs by the toolbar, where the user looks after filtering,
// not only after the list.
const ResultCount = ({ children }) => <p className="text-body-sm text-muted-foreground" aria-live="polite">{children}</p>;

// P6: every list pages — 20 a page (API contract §4), the summary «1–20 من 312», and on a
// phone Previous and Next around that summary instead of the page numbers.
const PAGE_SIZE = 20;
function usePaged(rows, pageSize = PAGE_SIZE) {
  const { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis, PaginationSummary } = window.MasahaDesignSystem;
  const [page, setPage] = React.useState(1);
  const total = rows.length;
  const last = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, last);
  const from = total ? (current - 1) * pageSize + 1 : 0;
  const to = Math.min(current * pageSize, total);
  // Reset to the first page whenever the filtered set shrinks past the current one.
  React.useEffect(() => { if (page > last) setPage(1); }, [last]);

  const summary = <span>{tr('عرض', 'Showing')} <Ltr>{from}</Ltr>–<Ltr>{to}</Ltr> {tr('من', 'of')} <Ltr>{total}</Ltr></span>;
  const step = (n) => (e) => { e.preventDefault(); setPage(n); };
  // Up to five numbers around the current page; the rest is an ellipsis.
  const first = Math.max(1, Math.min(current - 2, last - 4));
  const numbers = [];
  for (let n = first; n <= Math.min(last, first + 4); n++) numbers.push(n);

  // A short list keeps its steps, marked aria-disabled, so every list reads the same way.
  const nav = (
    <Pagination label={tr('صفحات القائمة', 'List pages')}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious asChild disabled={current === 1}>
            <button type="button" onClick={current === 1 ? undefined : step(current - 1)}>{tr('السابق', 'Previous')}</button>
          </PaginationPrevious>
        </PaginationItem>
        {numbers[0] > 1 && <PaginationItem><PaginationEllipsis label={tr('صفحات سابقة', 'Earlier pages')} /></PaginationItem>}
        {numbers.map((n) => (
          <PaginationItem key={n}>
            <PaginationLink asChild isActive={n === current}>
              <button type="button" onClick={step(n)}><Ltr>{n}</Ltr></button>
            </PaginationLink>
          </PaginationItem>
        ))}
        {numbers[numbers.length - 1] < last && <PaginationItem><PaginationEllipsis label={tr('صفحات تالية', 'Later pages')} /></PaginationItem>}
        <PaginationSummary>{tr('صفحة', 'Page')} <Ltr>{current}</Ltr> {tr('من', 'of')} <Ltr>{last}</Ltr></PaginationSummary>
        <PaginationItem>
          <PaginationNext asChild disabled={current === last}>
            <button type="button" onClick={current === last ? undefined : step(current + 1)}>{tr('التالي', 'Next')}</button>
          </PaginationNext>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );

  return { rows: rows.slice((current - 1) * pageSize, current * pageSize), summary, nav, total, page: current };
}
Object.assign(window, { TimeInput, FilterSheet, useIsTablet, usePaged, ResultCount, resultsLabel, PAGE_SIZE });
