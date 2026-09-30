const DS = window.MasahaDesignSystem;
const { Card: SCard, CardHeader: SCardHeader, CardTitle: SCardTitle, CardDescription: SCardDescription, CardContent: SCardContent, CardAction: SCardAction, Button: SButton, Badge: SBadge, Table: STable, TableHeader: STableHeader, TableBody: STableBody, TableRow: STableRow, TableHead: STableHead, TableCell: STableCell, Tabs: STabs, TabsList: STabsList, TabsTrigger: STabsTrigger, TabsContent: STabsContent, Alert: SAlert, AlertTitle: SAlertTitle, AlertDescription: SAlertDescription, Dialog: SDialog, DialogContent: SDialogContent, DialogHeader: SDialogHeader, DialogTitle: SDialogTitle, DialogDescription: SDialogDescription, CheckIcon: SCheckIcon, ChevronStartIcon: SChevronStart, ChevronEndIcon: SChevronEnd } = DS;
const SM = window.MASAHA;

const todayKey = () => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
const liveStatus = (s) => (s.closure ? 'closed' : s.status);

function HeartIcon({ filled }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

// Photo stand-in: real photos come from the space; no stock imagery.
function PhotoTile({ n, className }) {
  return <div className={'flex items-center justify-center rounded-lg bg-muted text-caption text-muted-foreground ' + (className || '')} role="img" aria-label={tr(`صورة ${n}`, `Photo ${n}`)}>{tr("صورة ", "Photo ")}{n}</div>;
}

function Gallery({ space }) {
  const [open, setOpen] = React.useState(false);
  const [i, setI] = React.useState(0);
  const n = space.photos || 0;
  if (!n) {
    return (
      <div className="flex gallery-h flex-col items-center justify-center gap-2 rounded-xl bg-muted" role="img" aria-label={tr(`لا توجد صور لـ ${space.name}`, `No photos of ${space.name}`)}>
        <span className="text-display text-muted-foreground" aria-hidden="true">{space.name[0]}</span>
        <span className="text-caption text-muted-foreground">{tr("لا توجد صور بعد", "No photos yet")}</span>
      </div>
    );
  }
  const show = (k) => { setI(k); setOpen(true); };
  // Layout by count so no cell is ever empty. Phone: the first photo only.
  const shown = Math.min(n, 5);
  const grid = { 1: 'grid-cols-1', 2: 'grid-cols-1 md:grid-cols-2', 3: 'grid-cols-1 md:grid-cols-3 gallery-rows', 4: 'grid-cols-1 md:grid-cols-4 gallery-rows', 5: 'grid-cols-1 md:grid-cols-4 gallery-rows' }[shown];
  const cell = (k) => {
    if (k === 0) return shown >= 3 ? 'md:col-span-2 md-row-span-2' : '';
    if (shown === 4 && k === 3) return 'md:col-span-2';
    return '';
  };
  const more = <>{tr("عرض كل الصور ", "View all photos ")}<span dir="ltr">({n})</span></>;
  return (
    <div className={'grid gallery-h gap-2 ' + grid}>
      {Array.from({ length: shown }, (_, k) => (
        <div key={k} className={'relative ' + (k > 0 ? 'hidden md:block ' : '') + cell(k)}>
          <button type="button" onClick={() => show(k)} aria-label={tr(`عرض الصورة ${k + 1}`, `View photo ${k + 1}`)} className="size-full rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><PhotoTile n={k + 1} className="size-full" /></button>
          {k === 0 && n > 1 && <SButton variant="outline" size="sm" className="gallery-more bg-card shadow-floating md:hidden" onClick={() => show(0)}>{more}</SButton>}
          {k === shown - 1 && shown >= 4 && <SButton variant="outline" size="sm" className="gallery-more hidden bg-card shadow-floating md:inline-flex" onClick={() => show(0)}>{more}</SButton>}
        </div>
      ))}
      <SDialog open={open} onOpenChange={setOpen}>
        <SDialogContent closeLabel={tr("إغلاق", "Close")} className="sm:max-w-3xl">
          <SDialogHeader>
            <SDialogTitle>{tr("صور ", "Photos of ")}{LANG === 'en' ? space.name : space.nameAr}</SDialogTitle>
            <SDialogDescription><span dir="ltr">{i + 1} / {n}</span></SDialogDescription>
          </SDialogHeader>
          <PhotoTile n={i + 1} className="lightbox-h" />
          {n > 1 && (
            <div className="flex items-center justify-between gap-2">
              <SButton variant="outline" onClick={() => setI((i - 1 + n) % n)}><SChevronStart />{tr("السابقة", "Previous")}</SButton>
              <SButton variant="outline" onClick={() => setI((i + 1) % n)}>{tr("التالية", "Next")}<SChevronEnd /></SButton>
            </div>
          )}
        </SDialogContent>
      </SDialog>
    </div>
  );
}

function StatusLine({ space }) {
  if (!space.verified) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-label text-muted-foreground">{tr("لا تتوفر حالة مباشرة", "No live status")}</span>
        <span className="text-caption text-muted-foreground">{tr("الحالة المباشرة تظهر للمساحات الموثّقة فقط", "Live status is shown for verified spaces only")}</span>
      </div>
    );
  }
  const st = liveStatus(space);
  const badge = st === 'open' ? <SBadge variant="success">{tr("متاح", "Available")}</SBadge> : st === 'full' ? <SBadge variant="warning">{tr("ممتلئ", "Full")}</SBadge> : <SBadge variant="neutral">{tr("مغلق الآن", "Closed now")}</SBadge>;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {badge}
      <span className="text-caption text-muted-foreground">{tr("آخر تحديث ", "Updated ")}{space.closure ? space.closure.date : space.statusUpdated}</span>
    </div>
  );
}

function TodayLine({ space }) {
  const h = space.hours[todayKey()];
  if (space.closure) return <span>{tr("مغلقة مؤقتًا اليوم", "Temporarily closed today")}</span>;
  return h ? <span>{tr("اليوم ", "Today ")}<span dir="ltr">{h[0]}–{h[1]}</span></span> : <span>{tr("مغلقة اليوم", "Closed today")}</span>;
}

const directionsHref = (s) => `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`;

function ContactButton({ c, className, variant = 'outline' }) {
  const ch = SM.channels[c.type];
  return (
    <SButton variant={variant} className={'justify-between ' + (className || '')} asChild>
      <a href={ch.href(c.value)} target={ch.phone || c.type === 'email' ? undefined : '_blank'} rel="noopener">
        <span lang={ch.latin ? 'en' : undefined}>{ch.label}</span>
        {(ch.phone || c.type === 'whatsapp') && <span dir="ltr" className={variant === 'outline' ? 'text-muted-foreground' : undefined}>{c.value}</span>}
      </a>
    </SButton>
  );
}

function StatusContactCard({ space, km, compact }) {
  const primary = space.contacts.filter((c) => c.type === 'whatsapp' || SM.channels[c.type].phone);
  const rest = space.contacts.filter((c) => !primary.includes(c));
  const list = compact ? rest : space.contacts;
  return (
    <SCard>
      <SCardHeader>
        <SCardTitle>{compact ? tr("الحالة والتواصل", "Status & contact") : tr("الحالة والتواصل", "Status & contact")}</SCardTitle>
      </SCardHeader>
      <SCardContent className="flex flex-col gap-4">
        <StatusLine space={space} />
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-body-sm text-muted-foreground">
          <TodayLine space={space} />
          {km != null && <Distance km={km} />}
        </div>
        {list.length > 0 && (
          <div className={compact ? 'flex flex-wrap gap-2' : 'flex flex-col gap-2'}>
            {list.map((c, k) => <ContactButton key={c.type} c={c} variant={!compact && k === 0 ? 'primary' : 'outline'} className={compact ? '' : 'w-full'} />)}
          </div>
        )}
        <SButton variant={compact ? 'outline' : 'secondary'} className={compact ? 'self-start' : 'w-full'} asChild><a href={directionsHref(space)} target="_blank" rel="noopener">{tr("الاتجاهات", "Directions")}</a></SButton>
        <p className="text-caption text-muted-foreground">{tr("للعرض فقط · الدفع والاشتراك في المساحة", "Display only · Pay and subscribe at the space")}</p>
      </SCardContent>
    </SCard>
  );
}

function Section({ id, title, meta, children, action }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={id} className="text-heading-2">{title}</h2>
        {action}
      </div>
      {children}
      {meta && <p className="text-caption text-muted-foreground">{meta}</p>}
    </section>
  );
}

function AboutSection({ space }) {
  return (
    <Section id="about" title={tr("عن المساحة", "About the space")}>
      <p className="text-body">{space.about}</p>
      {space.rules.length > 0 && (
        <div className="flex flex-col gap-1 text-body-sm">
          <h3 className="text-label">{tr("قواعد المساحة", "Space rules")}</h3>
          <ul className="flex list-disc-inside flex-col gap-1 ps-5 text-muted-foreground">{space.rules.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      )}
    </Section>
  );
}

const sameRange = (a, b) => (a && b ? a[0] === b[0] && a[1] === b[1] : a === b);
function groupDays(hours) {
  const groups = [];
  SM.weekOrder.forEach(([k, name]) => {
    const last = groups[groups.length - 1];
    if (last && sameRange(last.range, hours[k])) { last.keys.push(k); last.names.push(name); }
    else groups.push({ keys: [k], names: [name], range: hours[k] });
  });
  return groups;
}
const Range = ({ r }) => <span dir="ltr">{r[0]}–{r[1]}</span>;
function ShiftsLine({ space }) {
  if (!space.shifts) return null;
  return <span className="text-caption text-muted-foreground">{space.shifts.map((s, i) => <React.Fragment key={s.id}>{i > 0 && ' · '}{s.name} <Range r={s.range} /></React.Fragment>)}</span>;
}
function HoursCell({ space, range, isToday }) {
  if (isToday && space.closure) return <span className="text-label">{tr("مغلقة مؤقتًا", "Temporarily closed")}</span>;
  if (!range) return <span className="text-muted-foreground">{tr("مغلق", "Closed")}</span>;
  return <div className="flex flex-col items-start gap-1"><Range r={range} /><ShiftsLine space={space} /></div>;
}
const TodayBadge = () => <SBadge variant="primary">{tr("اليوم", "Today")}</SBadge>;

function HoursSection({ space }) {
  const t = todayKey();
  const groups = groupDays(space.hours);
  const [all, setAll] = React.useState(false);
  const canExpand = groups.length > 2;
  const rows = all ? SM.weekOrder.map(([k, name]) => ({ keys: [k], names: [name], range: space.hours[k] })) : groups;
  return (
    <Section id="hours" title={tr("ساعات العمل", "Opening hours")} meta={tr(`آخر تحديث لساعات العمل ${space.hoursUpdated}`, `Hours updated ${space.hoursUpdated}`)}
      action={canExpand && <SButton variant="link" size="sm" onClick={() => setAll(!all)} aria-expanded={all}>{all ? tr("عرض مختصر", "Show less") : tr("عرض كل الأيام", "Show all days")}</SButton>}>
      <SCard className="py-0">
        <STable>
          <caption className="sr-only">{tr("ساعات العمل الأسبوعية", "Weekly opening hours")}</caption>
          <STableHeader><STableRow><STableHead scope="col">{tr("الأيام", "Days")}</STableHead><STableHead scope="col">{tr("الساعات", "Hours")}</STableHead></STableRow></STableHeader>
          <STableBody>
            {rows.map((g) => {
              const today = g.keys.includes(t);
              const label = g.names.length > 2 ? `${g.names[0]} – ${g.names[g.names.length - 1]}` : g.names.join(tr("، ", ", "));
              const splitToday = today && space.closure && g.keys.length > 1;
              return (
                <STableRow key={g.keys.join()} className={today ? 'bg-accent' : ''} aria-current={today ? 'date' : undefined}>
                  <STableCell className={today ? 'text-label' : ''}>
                    <span className="flex flex-wrap items-center gap-2">{label}{today && <TodayBadge />}</span>
                  </STableCell>
                  <STableCell>
                    {splitToday ? (
                      <div className="flex flex-col items-start gap-1">
                        <HoursCell space={space} range={g.range} />
                        <span className="text-label">{tr("اليوم: مغلقة مؤقتًا", "Today: temporarily closed")}</span>
                      </div>
                    ) : <HoursCell space={space} range={g.range} isToday={today} />}
                  </STableCell>
                </STableRow>
              );
            })}
          </STableBody>
        </STable>
      </SCard>
    </Section>
  );
}

function PriceGrid({ prices, student }) {
  const cells = SM.periods.filter((p) => prices[p.id] != null);
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {cells.map((p) => (
          <div key={p.id} className="flex flex-col gap-1 rounded-lg bg-muted p-3">
            <dt className="text-caption text-muted-foreground">{p.short}</dt>
            <dd className="text-heading-3"><Money amount={prices[p.id]} /></dd>
          </div>
        ))}
      </dl>
      {student && (
        <dl className="flex flex-col gap-2">
          <dt className="text-label">{tr("للطلاب", "For students")}</dt>
          <dd className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="flex flex-col gap-1 rounded-lg bg-muted p-3">
              <span className="text-caption text-muted-foreground">{tr("شهر", "Month")}</span>
              <span className="text-heading-3"><Money amount={student} /></span>
            </div>
          </dd>
        </dl>
      )}
    </div>
  );
}

function PricesSection({ space }) {
  if (SM.priceHidden(space)) {
    return (
      <Section id="prices" title={tr("الأسعار", "Prices")}>
        <p className="rounded-lg bg-muted p-4 text-body text-muted-foreground">{tr("السعر غير محدّث — تواصل مع المساحة", "Price not up to date — contact the space")}</p>
      </Section>
    );
  }
  const meta = <>{tr("للعرض فقط · الدفع في المساحة · آخر تحديث ", "Display only · Pay at the space · Updated ")}{space.updated}</>;
  return (
    <Section id="prices" title={tr("الأسعار", "Prices")} meta={space.stale ? null : meta}>
      {space.stale && (
        <SAlert variant="warning">
          <SAlertTitle>{tr("قد تكون الأسعار تغيّرت — آخر تحديث ", "Prices may have changed — updated ")}{space.updated}</SAlertTitle>
          <SAlertDescription>{tr("تأكّد من السعر مع المساحة قبل الذهاب. للعرض فقط · الدفع في المساحة.", "Check the price with the space before you go. Display only · Pay at the space.")}</SAlertDescription>
        </SAlert>
      )}
      {space.shifts && space.shiftPrices ? (
        <STabs defaultValue="full">
          <STabsList aria-label={tr("الأسعار حسب الدوام", "Prices by shift")}>
            <STabsTrigger value="full">{tr("اليوم الكامل", "Full day")}</STabsTrigger>
            {space.shifts.map((s) => <STabsTrigger key={s.id} value={s.id}>{s.long}</STabsTrigger>)}
          </STabsList>
          <STabsContent value="full" className="pt-3"><PriceGrid prices={space.prices} student={space.studentMonth} /></STabsContent>
          {space.shifts.map((s) => (
            <STabsContent key={s.id} value={s.id} className="flex flex-col gap-3 pt-3">
              <p className="text-body-sm text-muted-foreground">{s.long} <span dir="ltr">{s.range[0]}–{s.range[1]}</span></p>
              <PriceGrid prices={space.shiftPrices[s.id]} />
            </STabsContent>
          ))}
        </STabs>
      ) : <PriceGrid prices={space.prices} student={space.studentMonth} />}
    </Section>
  );
}

function AmenitiesSection({ space }) {
  const list = SM.allAmenities.filter((a) => space.amenities.includes(a.id));
  if (!list.length) return null;
  return (
    <Section id="amenities" title={tr("المرافق", "Amenities")}>
      <ul className="flex flex-wrap gap-2">
        {list.map((a) => (
          <li key={a.id} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-body-sm">
            <SCheckIcon className="size-4 text-primary" aria-hidden="true" />{a.name}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function LocationSection({ space, user, userSource }) {
  return (
    <Section id="location" title={tr("الموقع", "Location")} action={<SButton variant="outline" size="sm" asChild><a href={directionsHref(space)} target="_blank" rel="noopener">{tr("الاتجاهات", "Directions")}</a></SButton>}>
      <SpaceMap spaces={[space]} selectedId={space.id} onSelect={() => {}} user={user} userSource={userSource} label={tr(`موقع ${space.name} على الخريطة`, `${space.name} on the map`)} className="h-64" />
      <div className="flex flex-col gap-1 text-body-sm">
        <p>{space.address}</p>
        {space.landmark && <p className="text-muted-foreground">{space.landmark}</p>}
      </div>
    </Section>
  );
}

function AnnouncementsSection({ space }) {
  if (!space.announcements.length) return null;
  return (
    <Section id="announcements" title={tr("الإعلانات", "Announcements")}>
      <SCard className="py-0">
        <ul className="divide-y">
          {space.announcements.map((a) => (
            <li key={a.title} className="flex flex-col gap-1 px-5 py-4">
              <span className="text-body">{a.title}</span>
              <span className="text-caption text-muted-foreground">{a.date}</span>
            </li>
          ))}
        </ul>
      </SCard>
    </Section>
  );
}

Object.assign(window, { HeartIcon, Gallery, StatusContactCard, ContactButton, AboutSection, HoursSection, PricesSection, AmenitiesSection, LocationSection, AnnouncementsSection, liveStatus, directionsHref });
