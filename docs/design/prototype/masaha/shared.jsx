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
function savedLoc() {
  try { const s = JSON.parse(sessionStorage.getItem(LOC_KEY)); return s && s.coords ? s : null; } catch (e) { return null; }
}
function initialLoc() {
  const p = pageParams.get('loc');
  if (p === 'granted') return { status: 'granted', source: 'gps', coords: M.demoUser };
  if (p === 'manual') return { status: 'granted', source: 'manual', coords: { lat: 31.5262, lng: 34.4500 } };
  if (p === 'denied' || p === 'imprecise' || p === 'picking' || p === 'locating') return { status: p };
  if (p) return { status: 'idle' };
  if (pageParams.get('pick') === '1') return { status: 'picking' };
  return savedLoc() || { status: 'idle' };
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
  // U7: «رجوع» returns to the location from before picking, whatever it was; only «مسح موقعي» clears one.
  // Arriving to pick from another page (Home's «تغيير الموقع»), the location before is this tab's saved one.
  const before = React.useRef(loc.status === 'picking' && !pageParams.get('loc') ? savedLoc() : null);
  const startPick = React.useCallback(() => setLoc((l) => { before.current = l.status === 'granted' ? l : null; return { status: 'picking' }; }), []);
  const cancelPick = React.useCallback(() => setLoc(before.current || { status: 'idle' }), []);
  const placePin = React.useCallback((coords) => setLoc({ status: 'granted', source: 'manual', coords }), []);
  const clear = React.useCallback(() => setLoc({ status: 'idle' }), []);
  React.useEffect(() => { if (pageParams.get('near') === '1' && !pageParams.get('loc') && loc.status === 'idle') request(); }, []);
  return { loc, coords: loc.status === 'granted' ? loc.coords : null, request, startPick, cancelPick, placePin, clear };
}

// SH-007 (and DI-7): an always-LTR value never breaks mid-number inside Arabic text.
const Ltr = ({ children }) => <span dir="ltr" className="num-iso">{children}</span>;
const Money = ({ amount }) => <Ltr>{LANG === 'en' ? `₪${amount}` : `${amount} ₪`}</Ltr>;
const fmtKm = (km) => (km < 10 ? km.toFixed(1) : Math.round(km)).toString();
const Distance = ({ km }) => <span>{tr("على بعد ", "About ")}<Ltr>{fmtKm(km)}</Ltr>{tr(" كم تقريبًا", " km away")}</span>;
const spaceHref = (s) => `Space details.html?id=${s.id}`;

// U3: one name for a space. In Arabic its Arabic name when it has one, else its English name (the
// required one); in English its English name. The other name appears only under the space page's h1.
const spaceName = (s) => (LANG === 'en' ? s.name : s.nameAr || s.name);
const otherName = (s) => (LANG === 'en' ? s.nameAr || null : s.nameAr ? s.name : null);
// An English-only name inside the Arabic interface is marked as English.
const SpaceName = ({ space }) => (LANG === 'ar' && !space.nameAr && !/[\u0600-\u06FF]/.test(space.name) ? <span lang="en">{space.name}</span> : spaceName(space));
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

// P7: the states a route can be in, rather than the page's own data. The dashboard shows
// them inside its shell with no actions, since the sidebar is the way on; the site offers
// its way back. `?state=offline|403|404` reaches them from any page.
const ROUTE_STATES = () => ({
  offline: { icon: 'alert', title: tr('لا يوجد اتصال بالإنترنت', 'No internet connection'), text: tr('ستظهر البيانات عند عودة الاتصال.', 'The data will appear when you’re back online.'), retry: true },
  403: { icon: 'alert', title: tr('لا تملك صلاحية هذه الصفحة', 'You don’t have access to this page'), text: tr('إن كنت تظن أن هذا خطأ، تواصل مع صاحب المساحة أو الإدارة.', 'If you think this is a mistake, ask the space’s owner or the admin.') },
  404: { icon: 'search', title: tr('الصفحة غير موجودة', 'Page not found'), text: tr('ربما تغيّر الرابط أو حُذفت الصفحة.', 'The link may have changed or the page was removed.') }
});
const routeState = () => ROUTE_STATES()[pageParams.get('state')] || null;

// P8: every action says it is working, it worked, or it failed.
// Working is live: the button waits about three quarters of a second with its `loading`
// state, so a second tap is impossible and a slow check-in cannot become a double one.
// Failing is a frame, as on the auth pages: ?fail=<key> fails that action, ?state=ratelimit
// shows the 429 line. Neither can be reached by clicking in a prototype with no server.
const ACTION_MS = 700;
const actionFails = (key) => key !== undefined && pageParams.get('fail') === String(key);
const RATE_LIMIT_LINE = tr('محاولات كثيرة، حاول بعد 15 دقيقة', 'Too many attempts, try again in 15 minutes');

// `success` is what changed; leave it out where the result shows in the row it changed —
// a switch, a reorder (P8, amended). The front desk is exempt: a check-in, a check-out and
// every money action always say so, and money says how much.
// For a form, whose submit validates first: validate, then `run` the action.
function useActionRun(actionKey) {
  const { toast } = window.MasahaDesignSystem;
  const [busy, setBusy] = React.useState(false);
  const run = (fn, success) => {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (actionFails(actionKey)) {
        toast.error(tr('تعذّر إتمام العملية', 'Couldn’t complete that'), { action: { label: tr('إعادة المحاولة', 'Try again'), onClick: () => run(fn, success) } });
        return;
      }
      if (fn) fn();
      if (success) toast.success(success);
    }, ACTION_MS);
  };
  return { busy, run };
}

function ActionButton({ actionKey, success, onAction, children, ...rest }) {
  const { Button } = window.MasahaDesignSystem;
  const { busy, run } = useActionRun(actionKey);
  return <Button {...rest} loading={busy} onClick={() => run(onAction, success)}>{children}</Button>;
}

// The failure of an action taken in a dialog or a sheet shows inside it, which stays open
// and keeps what was typed.
function ActionAlert({ for: key, children }) {
  const { Alert, AlertTitle, AlertDescription } = window.MasahaDesignSystem;
  if (!actionFails(key)) return null;
  return (
    <Alert variant="destructive">
      <AlertTitle>{tr('تعذّر إتمام العملية', 'Couldn’t complete that')}</AlertTitle>
      <AlertDescription>{children || tr('لم يصل الطلب. بياناتك كما هي — حاول مرة أخرى.', 'The request didn’t get through. Your input is kept — try again.')}</AlertDescription>
    </Alert>
  );
}

// Every endpoint may answer 429, so the warning is not the auth pages' alone.
function RateLimitNote() {
  const { Alert, AlertTitle } = window.MasahaDesignSystem;
  if (pageParams.get('state') !== 'ratelimit') return null;
  return <Alert variant="warning"><AlertTitle>{RATE_LIMIT_LINE}</AlertTitle></Alert>;
}

// P7: «تعذّر تحميل …» in place of the content, with a way to try again — the shape the
// Directory already used, now on every dashboard page through its shell.
function LoadError({ what }) {
  const { Alert, AlertTitle, AlertDescription, AlertAction, Button } = window.MasahaDesignSystem;
  return (
    <Alert variant="destructive">
      <AlertTitle>{what || tr('تعذّر تحميل محتوى الصفحة', 'Couldn’t load this page')}</AlertTitle>
      <AlertDescription>{tr('قد يكون الاتصال ضعيفًا. حاول مرة أخرى.', 'The connection may be weak. Try again.')}</AlertDescription>
      <AlertAction><Button variant="outline" size="sm" onClick={() => location.reload()}>{tr('إعادة المحاولة', 'Try again')}</Button></AlertAction>
    </Alert>
  );
}

function RouteState({ state }) {
  const { EmptyState, Button, SearchXIcon, CircleAlertIcon } = window.MasahaDesignSystem;
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <EmptyState icon={state.icon === 'search' ? <SearchXIcon /> : <CircleAlertIcon />} title={state.title} titleAs="h1" description={state.text}>
        {state.retry && <Button onClick={() => location.reload()}>{tr('إعادة المحاولة', 'Try again')}</Button>}
      </EmptyState>
    </div>
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

// U12: a stand-in for a space's cover photo. The archive has no real photos (no stock imagery), so
// each space gets a quiet drawn room in the layer's tokens, varied by space so the list is not one
// picture six times. In the product this frame holds the space's first photo, as a small thumbnail.
const COVER_TONES = ['cover-art tone-primary', 'cover-art tone-info', 'cover-art tone-success', 'cover-art tone-warning'];
function CoverArt({ seed }) {
  const n = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  const flip = Math.floor(n / COVER_TONES.length) % 2 === 1;
  return (
    <svg className={COVER_TONES[n % COVER_TONES.length]} viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect className="wall" width="320" height="180" />
      <g transform={flip ? 'translate(320 0) scale(-1 1)' : undefined}>
        <rect className="window" x="186" y="22" width="100" height="78" rx="6" />
        <path className="mullion" d="M236 22 V100 M186 61 H286" />
        <rect className="floor" y="128" width="320" height="52" />
        <rect className="wood" x="34" y="104" width="156" height="9" rx="3" />
        <rect className="wood" x="44" y="113" width="6" height="40" />
        <rect className="wood" x="174" y="113" width="6" height="40" />
        <rect className="paper" x="70" y="82" width="44" height="22" rx="3" />
        <circle className="lamp" cx="150" cy="92" r="10" />
        <circle className="leaf" cx="270" cy="124" r="18" />
        <rect className="wood" x="264" y="132" width="12" height="22" rx="2" />
      </g>
    </svg>
  );
}

// U12 (H2): the photo leads the card, in a frame of fixed ratio — 2:1 on a phone, 16:9 from 768 —
// reserved before anything arrives, so nothing moves on a weak connection: the frame waits muted,
// then shows the photo. With no photo, or one that did not load, it shows the space's mark, the
// first letter of its name, as the dashboard's switcher does (SH-006). `?photos=loading|failed`
// show those two states.
function SpaceCover({ space }) {
  const demo = pageParams.get('photos');
  const has = (space.photos || 0) > 0 && demo !== 'failed';
  return (
    <div className="cover-ratio relative w-full overflow-hidden bg-muted" aria-hidden="true">
      {demo === 'loading' ? <Skeleton className="absolute inset-0 size-full rounded-none" />
        : has ? <CoverArt seed={space.id} />
        : (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-xl bg-primary text-heading-1 text-primary-foreground shadow-raised">{spaceName(space)[0]}</span>
          </span>
        )}
    </div>
  );
}

// U12, as the owner decided on 2026-10-12: the card is the site's first impression, and it shows no
// price — prices live on the space page. Under the photo, what makes someone open it: the name, the
// area, the live state (or that it has none), today's hours, the distance when a location is in
// use. `action`: a control laid over the photo's top-end corner (the heart), outside the link.
function SpaceCard({ space, km, action }) {
  return (
    <div className="relative h-full">
      <a href={spaceHref(space)} className="block h-full rounded-lg text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <Card className="h-full pt-0 transition-colors hover:bg-accent">
          <SpaceCover space={space} />
          <CardHeader>
            <CardTitle><SpaceName space={space} /></CardTitle>
            <CardDescription>{areaLine(space)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-end gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <LiveStatus space={space} />
              {space.verified && <span className="inline-flex items-center gap-1 text-body-sm text-primary"><CircleCheckIcon className="size-4" aria-hidden="true" />{tr("موثّقة", "Verified")}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
              <TodayHours space={space} />
              {km != null && <Distance km={km} />}
            </div>
          </CardContent>
        </Card>
      </a>
      {action}
    </div>
  );
}

function SpaceCardSkeleton() {
  return (
    <Card className="pt-0" aria-hidden="true">
      <div className="cover-ratio relative w-full overflow-hidden"><Skeleton className="absolute inset-0 size-full rounded-none" /></div>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-20" />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  );
}

// U12 with PU-014: shortlisting happens where the comparing happens. On Home and the Directory a
// signed-in visitor saves a space from its card; the toast offers «تراجع» (P9).
const SAVED_DEMO = ['focus', 'branch', 'golden'];
function useFavourites() {
  const { toast } = window.MasahaDesignSystem;
  const [ids, setIds] = React.useState(SAVED_DEMO);
  const toggle = (s) => {
    const before = ids, on = ids.includes(s.id);
    setIds(on ? ids.filter((x) => x !== s.id) : [...ids, s.id]);
    toast(on ? tr("أُزيلت من المفضّلة", "Removed from favourites") : tr("أُضيفت إلى المفضّلة", "Added to favourites"), { description: spaceName(s), action: { label: tr("تراجع", "Undo"), onClick: () => setIds(before) } });
  };
  return { has: (s) => ids.includes(s.id), toggle };
}
function HeartButton({ space, on, onToggle }) {
  const name = spaceName(space);
  return (
    <Button variant="outline" size="icon" className={'fav-remove bg-card shadow-floating' + (on ? ' text-primary' : '')} aria-pressed={on}
      aria-label={on ? tr('إزالة ' + name + ' من المفضّلة', 'Remove ' + name + ' from favourites') : tr('حفظ ' + name + ' في المفضّلة', 'Save ' + name + ' to favourites')} onClick={() => onToggle(space)}>
      <HeartIcon filled={on} />
    </Button>
  );
}
function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

// One Toaster per page; shows a toast handed over from the auth pages (or ?toast= for the board).
const TOAST_KEY = 'masaha:toast';
const DEMO_TOASTS = { welcome: tr("أهلًا سارة، تم إنشاء حسابك", "Welcome Sara, your account is ready"), linked: tr("ربطنا حساب Google بحسابك", "We linked your Google account to your account") };
function PageToaster({ bottomBar }) {
  const { Toaster, toast } = window.MasahaDesignSystem;
  React.useEffect(() => {
    let list = [];
    try { list = JSON.parse(sessionStorage.getItem(TOAST_KEY)) || []; sessionStorage.removeItem(TOAST_KEY); } catch (e) {}
    const demo = pageParams.get('toast');
    if (demo) list = demo.split(',').map((k) => DEMO_TOASTS[k]).filter(Boolean);
    list.forEach((m, i) => setTimeout(() => toast.success(m, { duration: demo ? Infinity : 5000 }), 300 + i * 150));
  }, []);
  // P8: on a page with a fixed bottom bar the toast sits above it, so feedback never
    // covers the next action. (The layer's own offset is SH-012, worker A's.)
    return <Toaster label={tr("الإشعارات", "Notifications")} closeLabel={tr("إغلاق الإشعار", "Close notification")} position="bottom-center" mobileOffset={{ bottom: '5.5rem' }} offset={{ bottom: bottomBar ? '5.5rem' : '1.5rem' }} />;
}
const handOffToast = (...msgs) => { try { sessionStorage.setItem(TOAST_KEY, JSON.stringify(msgs)); } catch (e) {} };

const PRIVACY_LINE = tr("يبقى موقعك على جهازك فقط، ولا يُرسَل إلى أي جهة.", "Your location stays on your device and is never sent anywhere.");

Object.assign(window, { AccountMenuContent, ActionButton, ActionAlert, useActionRun, RateLimitNote, RATE_LIMIT_LINE, LoadError, PageActions, RouteState, routeState, SkipLink, dashboardHref, getUser, setUser, signOut, firstName, authQ, DEMO_USER, useTheme, useIsDesktop, useNearMe, GAZA_STRIP, pageParams, Ltr, Money, Distance, fmtKm, spaceHref, spaceName, otherName, SpaceName, locPass, SiteHeader, SiteFooter, statusWord, LiveStatus, TodayHours, SpaceMeta, areaLine, SpaceCover, SpaceCard, SpaceCardSkeleton, useFavourites, HeartButton, HeartIcon, PRIVACY_LINE, PageToaster, handOffToast });

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
// P5: the one filter bar. `at` is where it stops being a sheet — 768 everywhere, except the
// Directory, which keeps the desktop sidebar it already had and so switches at 1024.
// `wide` is what the caller wants above that: the filters drawn `inline` (the default, every
// list), the `sheet` kept because there is nowhere else (the Directory's map), or `none`
// because they live elsewhere there (the Directory's list view, where the sidebar has them).
// The footer is the Directory's: the primary says how many results, the ghost clears.
function FilterSheet({ children, active = 0, onClear, count, at = 'md', wide: wideAs = 'inline', description, open: openProp, onOpenChange }) {
  const { Button, Badge, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter } = window.MasahaDesignSystem;
    const desktop = useIsDesktop();
  const tablet = useIsTablet();
  const isWide = at === 'lg' ? desktop : tablet;
  const [ownOpen, setOwnOpen] = React.useState(pageParams.get('sheet') === 'filters');
  const open = openProp === undefined ? ownOpen : openProp;
  const setOpen = onOpenChange || setOwnOpen;
  if (isWide && wideAs === 'inline') return children;
  if (isWide && wideAs === 'none') return null;
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
