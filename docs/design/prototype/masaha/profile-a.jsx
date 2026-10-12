const { Card: PCard, CardHeader: PCardHeader, CardTitle: PCardTitle, CardDescription: PCardDescription, CardAction: PCardAction, CardContent: PCardContent, CardFooter: PCardFooter, Button: PButton, Badge: PBadge, Field: PField, Input: PInput, Textarea: PTextarea, Select: PSelect, SelectTrigger: PSelectTrigger, SelectValue: PSelectValue, SelectContent: PSelectContent, SelectItem: PSelectItem, SelectGroup: PSelectGroup, SelectLabel: PSelectLabel, Separator: PSeparator, Switch: PSwitch, Alert: PAlert, AlertDescription: PAlertDescription, XIcon: PX, toast: ptoast } = window.MasahaDesignSystem;

// A1: the space's five fact groups — the profile, the hours with the shifts, the prices, the
// amenities, the contacts — are what the server saves, dates and confirms, one at a time; the
// photos are no fact group. The editor's sections follow them, one name each, in the cards and
// in the navigation alike.
const FACT_GROUPS = ['profile', 'hours', 'prices', 'amenities', 'contacts'];

// "N days ago", through the Arabic plural forms.
const ago = (n) => (n <= 0 ? tr('اليوم', 'today') : n === 1 ? tr('أمس', 'yesterday') : n === 2 ? tr('قبل يومين', '2 days ago') : n <= 10 ? tr(`قبل ${n} أيام`, `${n} days ago`) : tr(`قبل ${n} يومًا`, `${n} days ago`));

// Each section saves on its own; dirty sections register so leaving the page warns.
// A group never saved is `missing`: it has no date and nothing to confirm until its first save.
const dirtySet = new Set();
window.addEventListener('beforeunload', (e) => { if (dirtySet.size) { e.preventDefault(); e.returnValue = ''; } });
function useSection(id, initial, missingAtFirst) {
  const [v, setV] = React.useState(initial);
  const [saved, setSaved] = React.useState(initial);
  const [updated, setUpdated] = React.useState(null);
  const [missing, setMissing] = React.useState(!!missingAtFirst);
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);
  React.useEffect(() => { dirty ? dirtySet.add(id) : dirtySet.delete(id); window.dispatchEvent(new Event('masaha-dirty')); }, [dirty]);
  React.useEffect(() => { window.dispatchEvent(new CustomEvent('masaha-group', { detail: { id, missing } })); }, [missing]);
  const save = (next) => { const value = next || v; setV(value); setSaved(value); setUpdated(tr('الآن', 'just now')); setMissing(false); ptoast.success(tr('حُفظ القسم', 'Section saved')); };
  return { v, setV, set: (p) => setV((x) => ({ ...x, ...p })), dirty, missing, save, reset: () => setV(saved), updated, touch: () => { setUpdated(tr('الآن', 'just now')); ptoast.success(tr('أكّدنا أن المعلومات ما زالت صحيحة', 'Confirmed as still correct')); } };
}

// A section's title is an h2, so the navigation's anchors land on headings (SH-017). The
// vendored CardTitle draws a div, so the heading goes inside it, as the code does.
const SectionTitle = ({ children }) => <PCardTitle><h2>{children}</h2></PCardTitle>;

// `validate` answers one line for the section's Alert, or { field: line } for the fields
// themselves (then `children` is a function of those errors, and the first takes the focus).
function ProfileSection({ id, title, description, updated, stale, headerAction, sec, children, validate, footerExtra }) {
  const [err, setErr] = React.useState(null);
  const form = React.useRef(null);
  const { busy, run } = useActionRun('save');
  const submit = (e) => {
    e.preventDefault();
    const m = validate ? validate(sec.v) : null;
    setErr(m);
    if (m && typeof m === 'object') setTimeout(() => { const bad = form.current.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); });
    if (!m) run(() => sec.save());
  };
  const fieldErrors = err && typeof err === 'object' ? err : {};
  // On a phone the header has no room beside the title: its action leads the content instead.
  const wide = useIsTablet();
  return (
    <PCard id={id} className="section-anchor">
      <PCardHeader>
        <SectionTitle>{title}</SectionTitle>
        <PCardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {description ? <span>{description} ·</span> : null}
          {sec.missing ? <span>{tr('لم تُضف بعد', 'Not added yet')}</span> : <span>{tr('آخر تحديث', 'Updated')} {sec.updated || updated}</span>}
          {stale && !sec.missing && !sec.updated && <PBadge variant="warning">{tr('قديمة', 'Out of date')}</PBadge>}
        </PCardDescription>
        {((wide && headerAction) || sec.dirty) && <PCardAction className="flex flex-wrap items-center justify-end gap-2">{wide && headerAction}{sec.dirty && <PBadge variant="warning">{tr('تغييرات غير محفوظة', 'Unsaved changes')}</PBadge>}</PCardAction>}
      </PCardHeader>
      <form ref={form} onSubmit={submit} noValidate className="flex flex-col gap-(--card-padding)">
        <PCardContent className="flex flex-col gap-5">
          {typeof err === 'string' && <PAlert variant="destructive"><PAlertDescription>{err}</PAlertDescription></PAlert>}
          <ActionAlert for="save" />
          {!wide && headerAction && <div className="flex flex-wrap items-center gap-2">{headerAction}</div>}
          {typeof children === 'function' ? children(fieldErrors) : children}
        </PCardContent>
        <PCardFooter className="flex flex-wrap gap-2">
          <PButton type="submit" loading={busy}>{tr('حفظ', 'Save')}</PButton>
          {sec.dirty && <PButton type="button" variant="ghost" onClick={() => { sec.reset(); setErr(null); }}>{tr('تجاهل التغييرات', 'Discard changes')}</PButton>}
          {!sec.dirty && !sec.missing && (footerExtra !== undefined ? footerExtra : <PButton type="button" variant="ghost" onClick={sec.touch}>{tr('المعلومات ما زالت صحيحة', 'Still correct')}</PButton>)}
        </PCardFooter>
      </form>
    </PCard>
  );
}

// #57's fields, which the creation form and the editor's «المساحة» share (D3): every field that
// may stay empty says so, the landmark is asked in both languages, the area is one field over the
// whole catalogue, and the pin is one value with its coordinates.
const Optional = () => <span className="text-caption text-muted-foreground">{tr('اختياري', 'Optional')}</span>;

// The contract's box (GAZA_STRIP_BOUNDS); the map's own is only the drawing's extent.
const STRIP = { south: 31.18, north: 31.64, west: 34.17, east: 34.62 };
const fmtCoords = ({ lat, lng }) => lat.toFixed(5) + ', ' + lng.toFixed(5);
// Arabic digits, the Arabic decimal mark and the Arabic comma are read as an admin pastes them.
const latinDigits = (t) => t.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/٫/g, '.').replace(/،/g, ',');
function parseCoords(text) {
  const m = latinDigits(text || '').trim().match(/^(-?\d+(?:\.\d+)?)\s*(?:,|\s)\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  return { lat: Number(m[1]), lng: Number(m[2]) };
}
function coordsError(text) {
  if (!(text || '').trim()) return tr('ضع الدبوس على الخريطة أو أدخل إحداثياته', 'Place the pin on the map, or enter its coordinates');
  const p = parseCoords(text);
  if (!p) return tr('أدخل الإحداثيات: خط العرض ثم خط الطول', 'Enter the coordinates as the latitude, then the longitude');
  if (p.lat < STRIP.south || p.lat > STRIP.north || p.lng < STRIP.west || p.lng > STRIP.east) return tr('هذه النقطة خارج قطاع غزة', 'This point is outside the Gaza Strip');
  return null;
}
const errorsOf = (o) => { const e = Object.fromEntries(Object.entries(o).filter(([, m]) => m)); return Object.keys(e).length ? e : null; };
const basicsErrors = (v) => ({ nameEn: !v.nameEn.trim() && tr('أدخل الاسم بالإنجليزية', 'Enter the English name') });
const locationErrors = (v) => ({ area: !v.area && tr('اختر المنطقة', 'Choose the area'), addrAr: !v.addrAr.trim() && tr('أدخل العنوان بالعربية', 'Enter the Arabic address'), coords: coordsError(v.coords) });

// What a space may take: the active governorates and their active areas (the public catalogue).
function areaCatalogue() {
  const AD = window.ADMIN;
  if (!AD) return window.MASAHA.governorates.filter((g) => g.areas.length);
  return AD.lookups.govs.filter((g) => g.active).map((g) => ({ id: g.id, name: tr(g.ar, g.en), areas: g.areas.filter((a) => a.active).map((a) => ({ id: a.id, name: tr(a.ar, a.en) })) })).filter((g) => g.areas.length);
}
function AreaSelect({ value, onChange }) {
  return (
    <PSelect value={value || ''} onValueChange={onChange}>
      <PSelectTrigger><PSelectValue placeholder={tr('اختر المنطقة', 'Choose an area')} /></PSelectTrigger>
      <PSelectContent>
        {areaCatalogue().map((g) => (
          <PSelectGroup key={g.id}>
            <PSelectLabel>{g.name}</PSelectLabel>
            {g.areas.map((a) => <PSelectItem key={a.id} value={a.id}>{a.name}</PSelectItem>)}
          </PSelectGroup>
        ))}
      </PSelectContent>
    </PSelect>
  );
}

function BasicsFields({ v, set, errors = {} }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PField label={tr('الاسم بالعربية', 'Name in Arabic')} labelEnd={<Optional />}><PInput lang="ar" dir="rtl" autoComplete="off" value={v.nameAr} onChange={(e) => set({ nameAr: e.target.value })} /></PField>
      <PField label={tr('الاسم بالإنجليزية', 'Name in English')} error={errors.nameEn}><PInput lang="en" dir="ltr" autoComplete="off" value={v.nameEn} onChange={(e) => set({ nameEn: e.target.value })} /></PField>
      <PField label={tr('الوصف بالعربية', 'Description in Arabic')} labelEnd={<Optional />}><PTextarea lang="ar" dir="rtl" rows={3} value={v.descAr} onChange={(e) => set({ descAr: e.target.value })} /></PField>
      <PField label={tr('الوصف بالإنجليزية', 'Description in English')} labelEnd={<Optional />}><PTextarea lang="en" dir="ltr" rows={3} value={v.descEn} onChange={(e) => set({ descEn: e.target.value })} /></PField>
    </div>
  );
}

// The pin has no place until it is given one (#57's D6, D7): a tap places it, and the
// coordinates under the map are the same value, the keyboard's way to place it.
function LocationFields({ v, set, errors = {} }) {
  const pin = parseCoords(v.coords);
  const pinSpace = pin ? [{ id: 'pin', name: v.nameEn || tr('المساحة', 'The space'), verified: false, lat: pin.lat, lng: pin.lng }] : [];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <PField label={tr('المنطقة', 'Area')} error={errors.area}><AreaSelect value={v.area} onChange={(a) => set({ area: a })} /></PField>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <PField label={tr('العنوان بالعربية', 'Address in Arabic')} error={errors.addrAr}><PInput lang="ar" dir="rtl" autoComplete="off" value={v.addrAr} onChange={(e) => set({ addrAr: e.target.value })} /></PField>
        <PField label={tr('العنوان بالإنجليزية', 'Address in English')} labelEnd={<Optional />}><PInput lang="en" dir="ltr" autoComplete="off" value={v.addrEn} onChange={(e) => set({ addrEn: e.target.value })} /></PField>
        <PField label={tr('علامة مميزة بالعربية', 'Landmark in Arabic')} labelEnd={<Optional />}><PInput lang="ar" dir="rtl" autoComplete="off" value={v.landmarkAr} onChange={(e) => set({ landmarkAr: e.target.value })} /></PField>
        <PField label={tr('علامة مميزة بالإنجليزية', 'Landmark in English')} labelEnd={<Optional />}><PInput lang="en" dir="ltr" autoComplete="off" value={v.landmarkEn} onChange={(e) => set({ landmarkEn: e.target.value })} /></PField>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-label">{tr('الموقع على الخريطة', 'Pin on the map')}</p>
        <SpaceMap spaces={pinSpace} selectedId="pin" onSelect={() => {}} picking onPick={(c) => set({ coords: fmtCoords(c) })} label={tr('خريطة قطاع غزة: اضغط لوضع دبوس المساحة', 'Map of the Gaza Strip: click to place the space’s pin')} className="h-64" />
        <p className="text-caption text-muted-foreground">{tr('اضغط على الخريطة لوضع الدبوس عند مدخل المساحة، واضغط مرة أخرى لنقله. أو أدخل إحداثياته.', 'Tap the map to place the pin at the space’s entrance, and tap again to move it. Or enter its coordinates.')}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <PField label={tr('الإحداثيات', 'Coordinates')} error={errors.coords} helper={<>{tr('خط العرض ثم خط الطول، كما تنسخهما الخريطة: ', 'Latitude, then longitude, as a map copies them: ')}<Ltr>31.52, 34.45</Ltr></>}>
          <PInput dir="ltr" autoComplete="off" spellCheck={false} value={v.coords} onChange={(e) => set({ coords: e.target.value })} />
        </PField>
      </div>
    </div>
  );
}

// The editor's sample profile: Focus Hub's texts on every space, as the archive's known limits say.
const sampleProfile = (space) => space.profile || ({
  nameAr: space.nameAr || '', nameEn: space.name || '',
  descAr: 'مساحة عمل هادئة للعمل الفردي والدراسة، فيها طاولات مشتركة وزاوية للمكالمات.', descEn: 'A quiet space for solo work and study, with shared desks and a corner for calls.',
  area: space.area || '', addrAr: 'النصر، شارع النصر، عمارة 12، الطابق الثالث', addrEn: 'An-Nasr, An-Nasr Street, Building 12, 3rd floor',
  landmarkAr: 'قرب مفترق العيون', landmarkEn: 'Near Al-Oyoun junction',
  coords: space.lat != null ? fmtCoords(space) : ''
});

// «المساحة»: the profile group — the basics and the location as two blocks of one section,
// with one date, one footer and one confirm, as `PATCH` saves them. The blocks keep their own
// anchors (#basics, #location), which a report's «تعديل الحقل» and the owner's links target.
function SpaceSection({ space, meta = {} }) {
  const sec = useSection('profile', sampleProfile(space));
  return (
    <ProfileSection id="profile" title={tr('المساحة', 'The space')} updated={meta.updated || tr('قبل أسبوعين', '2 weeks ago')} sec={sec} validate={(v) => errorsOf({ ...basicsErrors(v), ...locationErrors(v) })}>
      {(errors) => <>
        <section id="basics" aria-labelledby="basics-title" className="section-anchor flex flex-col gap-4">
          <h3 id="basics-title" className="text-label">{tr('الأساسيات', 'Basics')}</h3>
          <BasicsFields v={sec.v} set={sec.set} errors={errors} />
        </section>
        <PSeparator />
        <section id="location" aria-labelledby="location-title" className="section-anchor flex flex-col gap-4">
          <h3 id="location-title" className="text-label">{tr('الموقع', 'Location')}</h3>
          <LocationFields v={sec.v} set={sec.set} errors={errors} />
        </section>
      </>}
    </ProfileSection>
  );
}

// A2: what a space still lacks, at the head of its editor — the five groups, each a link to its
// section, «تمّت» or «لم تُضف بعد» (warning, as A8 sets for missing). A section's first save ticks
// its line; once nothing is missing the list goes.
function MissingChecklist({ names, missing: initial }) {
  const [missing, setMissing] = React.useState(initial);
  React.useEffect(() => {
    const on = (e) => setMissing((m) => (e.detail.missing ? (m.includes(e.detail.id) ? m : [...m, e.detail.id]) : m.filter((g) => g !== e.detail.id)));
    window.addEventListener('masaha-group', on);
    return () => window.removeEventListener('masaha-group', on);
  }, []);
  if (!missing.length) return null;
  return (
    <PCard id="missing" aria-labelledby="missing-title">
      <PCardHeader>
        <PCardTitle><h2 id="missing-title">{tr('ما زال ناقصًا', 'Still missing')}</h2></PCardTitle>
        <PCardDescription>{tr('احفظ كل قسم مرة على الأقل، فارغًا إن لم يكن له ما يُضاف.', 'Save each section at least once — empty, if it has nothing to add.')}</PCardDescription>
      </PCardHeader>
      <PCardContent>
        <ul className="flex flex-col divide-y">
          {FACT_GROUPS.map((g) => {
            const gone = missing.includes(g);
            return (
              <li key={g} className="flex items-center justify-between gap-3 py-2">
                <a href={'#' + g} className="text-body">{names[g]}</a>
                <PBadge variant={gone ? 'warning' : 'success'}>{gone ? tr('لم تُضف بعد', 'Not added yet') : tr('تمّت', 'Done')}</PBadge>
              </li>
            );
          })}
        </ul>
      </PCardContent>
    </PCard>
  );
}

// The section in view: the last whose top has passed under the bars. A chosen chip is marked at
// once, before the scroll it starts has settled.
function useCurrentSection(ids) {
  const [current, setCurrent] = React.useState(ids[0]);
  const hold = React.useRef(0);
  React.useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (Date.now() < hold.current) return;
      const line = (window.innerWidth >= 1024 ? 96 : 150);
      let c = ids[0];
      for (const id of ids) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= line) c = id; }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) c = ids[ids.length - 1];
      setCurrent(c);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [ids.join()]);
  return [current, (id) => { hold.current = Date.now() + 900; setCurrent(id); }];
}

// A1/AD-011: the sections' map at every width — a sticky list from lg, and below it a row of
// chips under the top bar, scrolling sideways; both mark the section in view. `wideOnly` drops
// it below lg (a read-only page, whose sections are short).
function SectionNav({ sections, wideOnly }) {
  const wide = useIsDesktop();
  const [current, choose] = useCurrentSection(sections.map(([id]) => id));
  const row = React.useRef(null);
  React.useEffect(() => {
    if (wide || !row.current) return;
    const bar = document.querySelector('[data-slot=sidebar-inset] > header');
    const place = () => { if (row.current && bar) row.current.style.top = bar.offsetHeight + 'px'; };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [wide]);
  React.useEffect(() => {
    const chip = row.current && row.current.querySelector('[aria-current]');
    if (chip) chip.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [current, wide]);
  if (!wide && wideOnly) return null;
  const item = ([id, label]) => {
    const on = current === id;
    return (
      <PButton key={id} variant={on ? 'secondary' : wide ? 'ghost' : 'outline'} size="sm" className={wide ? 'w-full justify-start' : 'shrink-0 rounded-full'} aria-current={on ? 'location' : undefined} asChild>
        <a href={'#' + id} onClick={() => choose(id)}>{label}</a>
      </PButton>
    );
  };
  return wide
    ? <nav aria-label={tr('أقسام الملف', 'Profile sections')} className="profile-toc lg:col-span-3 lg:flex lg:flex-col lg:gap-1">{sections.map(item)}</nav>
    : <nav ref={row} aria-label={tr('أقسام الملف', 'Profile sections')} className="section-chips flex gap-2 overflow-x-auto">{sections.map(item)}</nav>;
}

const DAYS = () => window.MASAHA.weekOrder;
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

// The hours and the prices share what is saved: a price may name a saved shift only (S7), and a
// shift a saved price uses cannot be removed (DI-13). Each section publishes what it saved.
const editorStore = { shifts: [], usedShifts: [] };
const publish = (key, value) => { editorStore[key] = value; window.dispatchEvent(new Event('masaha-store')); };
function useStored(key) {
  const [value, setValue] = React.useState(editorStore[key]);
  React.useEffect(() => { const on = () => setValue(editorStore[key]); window.addEventListener('masaha-store', on); return () => window.removeEventListener('masaha-store', on); }, []);
  return value;
}

// A time of day typed as digits. An end may be 24:00, the day's own end (DI-15): a day open until
// midnight closes at minute 1,440, which the shared TimeInput, capped at 23:59, cannot hold.
function ClockInput({ value, onChange, end, ...rest }) {
  const [txt, setTxt] = React.useState(value || '');
  React.useEffect(() => setTxt(value || ''), [value]);
  const shape = (raw) => { const d = raw.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + ':' + d.slice(2) : d; };
  const commit = () => {
    const d = txt.replace(/\D/g, ''); if (!d) return;
    let h = Number(d.length <= 2 ? d : d.slice(0, d.length - 2)), m = Number(d.length <= 2 ? 0 : d.slice(-2));
    if (end && h >= 24) { h = 24; m = 0; } else { h = Math.min(23, h); m = Math.min(59, m); }
    const v = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); setTxt(v); onChange(v);
  };
  const valid = (v) => { if (!/^\d{2}:\d{2}$/.test(v)) return false; const [h, m] = v.split(':').map(Number); return m < 60 && (h < 24 || (end && h === 24 && m === 0)); };
  const enter = (e) => { if (e.key !== 'Enter') return; e.preventDefault(); commit(); const form = e.currentTarget.form; setTimeout(() => form && form.requestSubmit()); };
  return <PInput {...rest} type="text" inputMode="numeric" dir="ltr" placeholder="08:00" maxLength={5} value={txt} onChange={(e) => { const v = shape(e.target.value); setTxt(v); if (valid(v)) onChange(v); }} onBlur={commit} onKeyDown={enter} />;
}

const SHIFT_LIMIT = 10;
const LimitNote = ({ children }) => <span className="text-caption text-muted-foreground">{children}</span>;
const dayRange = (d) => [toMin(d.from), toMin(d.to)];
const rangeText = (d) => d.from + '–' + d.to;

// AD-009 and S2: the server takes a shift that lies inside at least one open day. So the error is
// a shift that fits none; the open days it does not fit are named under it, as a helper.
function shiftCheck(shift, days) {
  const from = toMin(shift.from), to = toMin(shift.to);
  if (!(to > from)) return { error: tr('النهاية بعد البداية', 'The end comes after the start') };
  const open = DAYS().filter(([k]) => days[k].open);
  if (!open.length) return { error: tr('لا يوم مفتوح بعد', 'No day is open yet') };
  const outside = open.filter(([k]) => { const [o, c] = dayRange(days[k]); return from < o || to > c; });
  if (outside.length === open.length) return { error: tr('خارج ساعات كل يوم مفتوح', 'Outside the hours of every open day') };
  // One or two days are named with their hours; more, by name alone.
  if (outside.length) return { helper: tr('لا تنطبق: ', 'Doesn’t apply on ') + outside.map(([k, n]) => (outside.length > 2 ? n : n + ' (' + rangeText(days[k]) + ')')).join(tr('، ', ', ')) };
  return {};
}

const SAMPLE_SHIFTS = () => [{ id: 'am', ar: 'الوردية الصباحية', en: 'Morning shift', from: '08:00', to: '13:00' }, { id: 'pm', ar: 'الوردية المسائية', en: 'Evening shift', from: '13:00', to: '18:00' }];

function HoursSection({ meta = {} }) {
  const used = useStored('usedShifts');
  const init = { days: Object.fromEntries(DAYS().map(([k]) => [k, { open: k !== 'fri', from: '08:00', to: '18:00' }])), shifts: SAMPLE_SHIFTS() };
  if (meta.missing) init.shifts = [];
  else if (pageParams.get('demo') === 'shifterror') init.shifts[1].to = '19:30';
  const sec = useSection('hours', init, meta.missing);
  React.useEffect(() => { publish('shifts', meta.missing ? [] : init.shifts); }, []);
  const setDay = (k, p) => sec.set({ days: { ...sec.v.days, [k]: { ...sec.v.days[k], ...p } } });
  const setShift = (i, p) => sec.set({ shifts: sec.v.shifts.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const first = DAYS().find(([k]) => sec.v.days[k].open);
  // From the first open day, in the week's order, to every open day; closed days stay closed.
  const copyAll = () => { const d = sec.v.days[first[0]]; sec.set({ days: Object.fromEntries(DAYS().map(([k]) => [k, sec.v.days[k].open ? { ...sec.v.days[k], from: d.from, to: d.to } : sec.v.days[k]])) }); };
  const dayError = (d) => (d.open && toMin(d.to) <= toMin(d.from) ? tr('بعد البداية', 'After the start') : undefined);
  const hoursErrors = (v) => {
    const out = {};
    DAYS().forEach(([k]) => { if (dayError(v.days[k])) out['day-' + k] = dayError(v.days[k]); });
    v.shifts.forEach((x, i) => {
      if (!x.ar.trim()) out['shift-' + i + '-ar'] = tr('أدخل اسم الوردية بالعربية', 'Enter the shift’s Arabic name');
      else if (v.shifts.findIndex((y) => y.ar.trim() === x.ar.trim()) < i) out['shift-' + i + '-ar'] = tr('اسم وردية مكرّر', 'A repeated shift name');
      const c = shiftCheck(x, v.days);
      if (c.error) out['shift-' + i + '-to'] = c.error;
    });
    return errorsOf(out);
  };
  // R2: a saved shift keeps its id — a new one takes its id at its first save and keeps it, in the
  // section too, so a price naming it protects it and still names it after the next save.
  const save = () => {
    const value = { ...sec.v, shifts: sec.v.shifts.map((x) => (x.id ? x : { ...x, id: 'n' + Math.random().toString(36).slice(2, 7) })) };
    sec.save(value);
    publish('shifts', value.shifts);
  };
  return (
    <ProfileSection id="hours" title={tr('ساعات العمل', 'Opening hours')} updated={meta.updated || tr('قبل أسبوع', 'a week ago')} stale={meta.stale} sec={{ ...sec, save }}
      headerAction={first && <PButton type="button" variant="outline" size="sm" onClick={copyAll}>{tr('نسخ إلى كل الأيام', 'Copy to all days')}</PButton>}
      validate={hoursErrors}>
      {(errors) => <>
        <p className="text-caption text-muted-foreground">{first ? tr(`«نسخ إلى كل الأيام» ينسخ ساعات ${first[1]} إلى كل يوم مفتوح.`, `“Copy to all days” copies ${first[1]}’s hours to every open day.`) : tr('افتح يومًا واحدًا على الأقل.', 'Open at least one day.')}</p>
        <ul className="flex flex-col divide-y rounded-lg border border-border">
          {DAYS().map(([k, name]) => {
            const d = sec.v.days[k];
            return (
              <li key={k} className="flex flex-col gap-3 px-3 py-3 md:flex-row md:items-end md:gap-4">
                <div className="day-name flex items-center justify-between gap-3 md:self-center">
                  <span className="text-label">{name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-body-sm text-muted-foreground" aria-hidden="true">{d.open ? tr('مفتوحة', 'Open') : tr('مغلقة', 'Closed')}</span>
                    <PSwitch checked={d.open} onCheckedChange={(o) => setDay(k, { open: o })} aria-label={tr('مفتوحة يوم ', 'Open on ') + name} />
                  </span>
                </div>
                {d.open && <div className="grid grid-cols-2 gap-3">
                  <PField label={tr('من', 'From')}><ClockInput value={d.from} onChange={(v) => setDay(k, { from: v })} className="w-24" /></PField>
                  <PField label={tr('إلى', 'To')} error={dayError(d)}><ClockInput end value={d.to} onChange={(v) => setDay(k, { to: v })} className="w-24" /></PField>
                </div>}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-label">{tr('الورديات', 'Shifts')}</h3>
            <span className="text-caption text-muted-foreground">{tr('اختيارية. تقع كل وردية داخل ساعات يوم مفتوح واحد على الأقل.', 'Optional. Each shift lies inside the hours of at least one open day.')}</span>
          </div>
          {sec.v.shifts.length > 0 && <ul className="flex flex-col gap-3">
            {sec.v.shifts.map((x, i) => {
              const c = shiftCheck(x, sec.v.days);
              const inUse = !!x.id && used.includes(x.id);
              return (
                <li key={x.id || 'k' + i} className="flex flex-col gap-3 rounded-lg border border-border p-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <PField label={tr('الاسم بالعربية', 'Name in Arabic')} error={errors['shift-' + i + '-ar']}><PInput lang="ar" dir="rtl" value={x.ar} onChange={(e) => setShift(i, { ar: e.target.value })} /></PField>
                    <PField label={tr('الاسم بالإنجليزية', 'Name in English')} labelEnd={<Optional />}><PInput lang="en" dir="ltr" value={x.en} onChange={(e) => setShift(i, { en: e.target.value })} /></PField>
                  </div>
                  <div className="grid items-start gap-3 md:grid-cols-2">
                    <PField label={tr('من', 'From')}><ClockInput value={x.from} onChange={(v) => setShift(i, { from: v })} /></PField>
                    <PField label={tr('إلى', 'To')} error={c.error} helper={c.helper}><ClockInput end value={x.to} onChange={(v) => setShift(i, { to: v })} /></PField>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PButton type="button" variant="ghost" size="sm" disabled={inUse} onClick={() => sec.set({ shifts: sec.v.shifts.filter((_, j) => j !== i) })}><PX />{tr('حذف الوردية', 'Remove shift')}</PButton>
                    {inUse && <LimitNote>{tr('يستخدمها سعر — غيّره في الأسعار أولًا', 'A price uses it — change that price first')}</LimitNote>}
                  </div>
                </li>
              );
            })}
          </ul>}
          <div className="flex flex-wrap items-center gap-3">
            <PButton type="button" variant="outline" disabled={sec.v.shifts.length >= SHIFT_LIMIT} onClick={() => sec.set({ shifts: [...sec.v.shifts, { id: null, ar: '', en: '', from: '08:00', to: '13:00' }] })}>{tr('إضافة وردية', 'Add shift')}</PButton>
            {sec.v.shifts.length >= SHIFT_LIMIT && <LimitNote>{tr('الحد 10 ورديات', 'Up to 10 shifts')}</LimitNote>}
          </div>
        </div>
      </>}
    </ProfileSection>
  );
}

Object.assign(window, { FACT_GROUPS, ago, SAMPLE_SHIFTS, publish, useStored, LimitNote, latinDigits, useSection, ProfileSection, SectionTitle, SpaceSection, SectionNav, MissingChecklist, HoursSection, dirtySet, Optional, BasicsFields, LocationFields, AreaSelect, parseCoords, fmtCoords, coordsError, errorsOf, basicsErrors, locationErrors, sampleProfile });
