const { Card: PCard, CardHeader: PCardHeader, CardTitle: PCardTitle, CardDescription: PCardDescription, CardAction: PCardAction, CardContent: PCardContent, Button: PButton, Badge: PBadge, Field: PField, Input: PInput, Textarea: PTextarea, Select: PSelect, SelectTrigger: PSelectTrigger, SelectValue: PSelectValue, SelectContent: PSelectContent, SelectItem: PSelectItem, SelectGroup: PSelectGroup, SelectLabel: PSelectLabel, Sheet: PSheet, SheetContent: PSheetContent, SheetHeader: PSheetHeader, SheetTitle: PSheetTitle, SheetDescription: PSheetDescription, SheetBody: PSheetBody, SheetFooter: PSheetFooter, AlertDialog: PAlert, AlertDialogContent: PAlertContent, AlertDialogHeader: PAlertHeader, AlertDialogTitle: PAlertTitle, AlertDialogDescription: PAlertDescription, AlertDialogFooter: PAlertFooter, AlertDialogCancel: PAlertCancel, AlertDialogAction: PAlertAction, XIcon: PX, EyeIcon: PEye, toast: ptoast } = window.MasahaDesignSystem;

// Refactor 2 (2026-11-08): the space profile is read first and edited on request (G1). The API's
// five fact groups — the profile, the hours with the shifts, the prices, the amenities, the
// contacts — are saved, dated and confirmed one at a time; the page shows them as eight sections in
// the public page's order (G2), two pairs over one group each (B2/L2, S1). The photos are no group.
const FACT_GROUPS = ['profile', 'hours', 'prices', 'amenities', 'contacts'];

// "N days ago", through the Arabic plural forms.
const ago = (n) => (n <= 0 ? tr('اليوم', 'today') : n === 1 ? tr('أمس', 'yesterday') : n === 2 ? tr('قبل يومين', '2 days ago') : n <= 10 ? tr(`قبل ${n} أيام`, `${n} days ago`) : tr(`قبل ${n} يومًا`, `${n} days ago`));

// A section's title is an h2, so the index's anchors land on headings (SH-017). The vendored
// CardTitle draws a div, so the heading goes inside it, as the code does.
const SectionTitle = ({ children }) => <PCardTitle><h2>{children}</h2></PCardTitle>;

// ---------------------------------------------------------------------------------------------
// The creation form's fields (Admin space add.html, #57's D3): kept as they were.
// ---------------------------------------------------------------------------------------------
const Optional = () => <span className="text-caption text-muted-foreground">{tr('اختياري', 'Optional')}</span>;
const STRIP = { south: 31.18, north: 31.64, west: 34.17, east: 34.62 };
const fmtCoords = ({ lat, lng }) => lat.toFixed(5) + ', ' + lng.toFixed(5);
// Arabic digits, the Arabic decimal mark and the Arabic comma are read as they are pasted.
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
  if (p.lat < STRIP.south || p.lat > STRIP.north || p.lng < STRIP.west || p.lng > STRIP.east) return tr('الموقع خارج قطاع غزة', 'The location is outside the Gaza Strip');
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

// ---------------------------------------------------------------------------------------------
// Hours and shifts: shared rules (AD-007, AD-009, DI-13, DI-15).
// ---------------------------------------------------------------------------------------------
const DAYS = () => window.MASAHA.weekOrder;
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
// The hours and the prices share what is saved: a price may name a saved shift only (S7), and a
// shift a saved price or package uses cannot be removed (DI-13). Packages.html publishes its own.
const editorStore = { shifts: [], usedShifts: [] };
const publish = (key, value) => { editorStore[key] = value; window.dispatchEvent(new Event('masaha-store')); };
function useStored(key) {
  const [value, setValue] = React.useState(editorStore[key]);
  React.useEffect(() => { const on = () => setValue(editorStore[key]); window.addEventListener('masaha-store', on); return () => window.removeEventListener('masaha-store', on); }, []);
  return value;
}
const SHIFT_LIMIT = 10;
const LimitNote = ({ children }) => <span className="text-caption text-muted-foreground">{children}</span>;
const dayRange = (d) => [toMin(d.from), toMin(d.to)];
const rangeText = (d) => d.from + '–' + d.to;
// AD-009 and S3: the server takes a shift that lies inside at least one open day.
function shiftCheck(shift, days) {
  const from = toMin(shift.from), to = toMin(shift.to);
  if (!(to > from)) return { error: tr('«إلى» بعد «من»', '“To” comes after “From”') };
  const open = DAYS().filter(([k]) => days[k] && days[k].open);
  if (!open.length) return { error: tr('لا يوم مفتوح بعد في ساعات العمل', 'No day is open in the opening hours yet') };
  const outside = open.filter(([k]) => { const [o, c] = dayRange(days[k]); return from < o || to > c; });
  if (outside.length === open.length) return { error: tr('خارج ساعات كل يوم مفتوح', 'Outside the hours of every open day') };
  if (outside.length) return { helper: tr('لا تنطبق: ', 'Doesn’t apply on ') + outside.map(([k, n]) => (outside.length > 2 ? n : n + ' (' + rangeText(days[k]) + ')')).join(tr('، ', ', ')) };
  return {};
}
const SAMPLE_SHIFTS = () => [{ id: 'am', ar: 'الصباحية', en: 'Morning', from: '08:00', to: '13:00' }, { id: 'pm', ar: 'المسائية', en: 'Evening', from: '13:00', to: '18:00' }];

// ---------------------------------------------------------------------------------------------
// The page's store: the sections' data and the five groups' dates, in one object.
// ---------------------------------------------------------------------------------------------
// Which group dates a section: «عن المساحة» and «الموقع» share the profile's, «الورديات» the hours'.
const PF_GROUP = { photos: null, prices: 'prices', hours: 'hours', shifts: 'hours', amenities: 'amenities', about: 'profile', location: 'profile', contacts: 'contacts' };
// G2: the public page's order. The index and the header's completeness read it.
const PF_SECTIONS = () => [['photos', tr('الصور', 'Photos')], ['prices', tr('الأسعار المعلنة', 'Published prices')], ['hours', tr('ساعات العمل', 'Opening hours')], ['shifts', tr('الورديات', 'Shifts')], ['amenities', tr('المرافق', 'Amenities')], ['about', tr('عن المساحة', 'About the space')], ['location', tr('الموقع', 'Location')], ['contacts', tr('التواصل', 'Contacts')]];
const PF_COUNTED = ['photos', 'prices', 'hours', 'amenities', 'about', 'location', 'contacts'];
const pfFilled = (k, d) => ({
  photos: () => d.photos.some((p) => p.state === 'done'),
  prices: () => d.prices.length > 0,
  hours: () => !!d.hours,
  shifts: () => d.shifts.length > 0,
  amenities: () => d.amenities.list.length + d.amenities.own.length > 0,
  about: () => !!d.about.nameEn.trim(),
  location: () => !!d.location.addrAr.trim() && !!parseCoords(d.location.coords),
  contacts: () => d.contacts.length > 0
})[k]();
// complete · stale · missing · optional (the shifts, when there are none).
function pfState(k, d) {
  const filled = pfFilled(k, d);
  if (k === 'shifts' && !filled) return 'optional';
  if (!filled) return 'missing';
  const g = PF_GROUP[k];
  return g && d.groups[g].stale ? 'stale' : 'ok';
}

function usePfStore(initial) {
  const [d, setD] = React.useState(initial);
  const api = React.useMemo(() => ({
    // A Sheet's «حفظ»: the section's value, and its group dated now (an executor check: a save of
    // one section of a shared group never clears the other's, B2/L2/S5).
    save: (k, value) => setD((x) => { const next = Object.assign({}, x, { [k]: value }); const g = PF_GROUP[k]; if (g) next.groups = Object.assign({}, x.groups, { [g]: { days: 0, now: true, stale: false } }); return next; }),
    // «ما زالت صحيحة»: the group is dated now, its values as they are.
    confirm: (k) => { const g = PF_GROUP[k]; setD((x) => Object.assign({}, x, { groups: Object.assign({}, x.groups, { [g]: { days: 0, now: true, stale: false } }) })); ptoast.success(tr('أكّدنا أن المعلومات ما زالت صحيحة', 'Confirmed as still correct')); },
    // The photos save each act at once, with no date (P2).
    photos: (fn) => setD((x) => Object.assign({}, x, { photos: typeof fn === 'function' ? fn(x.photos) : fn }))
  }), []);
  return [d, api];
}

// ---------------------------------------------------------------------------------------------
// The section's frame (G3): the title, its date, «تعديل»; stale and empty states; a report inside.
// ---------------------------------------------------------------------------------------------
const pfUpdated = (g) => (g.now ? tr('آخر تحديث الآن', 'Updated just now') : tr('آخر تحديث ', 'Updated ') + ago(g.days));

// `count` replaces the date (the photos); `empty` is { text, action, onAction } for a section with
// nothing yet; `readOnly` (a verified space on the admin's page) drops every action.
function PfSection({ id, title, d, api, onEdit, editLabel, count, empty, readOnly, notice, headAction, children }) {
  const state = pfState(id, d);
  const g = PF_GROUP[id] ? d.groups[PF_GROUP[id]] : null;
  const isEmpty = !pfFilled(id, d);
  const meta = [];
  if (count) meta.push(<span key="count">{count}</span>);
  if (g && !isEmpty) meta.push(<span key="date">{pfUpdated(g)}</span>);
  if (state === 'stale') meta.push(<PBadge key="stale" variant="warning">{tr('قد تكون قديمة', 'May be out of date')}</PBadge>);
  const action = headAction !== undefined ? headAction : (!readOnly && !isEmpty && onEdit ? <PButton type="button" variant="outline" size="sm" onClick={onEdit} aria-label={editLabel || tr('تعديل ', 'Edit ') + title}>{tr('تعديل', 'Edit')}</PButton> : null);
  return (
    <PCard id={id} className="section-anchor" aria-labelledby={id + '-title'}>
      <PCardHeader>
        <PCardTitle><h2 id={id + '-title'}>{title}</h2></PCardTitle>
        {meta.length > 0 && <PCardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">{meta}</PCardDescription>}
        {action && <PCardAction>{action}</PCardAction>}
      </PCardHeader>
      <PCardContent className="flex flex-col gap-4">
        {notice}
        {state === 'stale' && !readOnly && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning-subtle px-3 py-2 text-body-sm text-warning-subtle-foreground">
            <span>{tr('مرّ وقت على آخر تحديث. راجعها، وإن كانت صحيحة أكّدها.', 'It’s been a while since the last update. Check it, and confirm it if it’s right.')}</span>
            <PButton type="button" variant="outline" size="sm" onClick={() => api.confirm(id)}>{tr('ما زالت صحيحة', 'Still correct')}</PButton>
          </div>
        )}
        {isEmpty && empty ? <PfEmpty text={empty.text} hint={empty.hint} action={readOnly ? null : empty.action} onAction={empty.onAction} primary={empty.primary !== false} /> : children}
      </PCardContent>
    </PCard>
  );
}
function PfEmpty({ text, hint, action, onAction, primary }) {
  return (
    <div className="pf-empty flex flex-col items-center gap-3 rounded-lg p-6 text-center">
      <p className="text-body text-muted-foreground">{text}</p>
      {hint && <p className="text-body-sm text-muted-foreground">{hint}</p>}
      {action && <PButton type="button" variant={primary ? 'primary' : 'outline'} onClick={onAction}>{action}</PButton>}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// The edit Sheet (G1): one per section. «حفظ» validates and saves; «رجوع», the close button,
// Escape and the overlay all ask «تجاهل التغييرات؟» first when something changed (G4). The layer
// keeps the focus inside and gives it back to «تعديل» on closing.
// ---------------------------------------------------------------------------------------------
function PfSheet({ open, title, description, dirty, onSave, onClose, children }) {
  const [ask, setAsk] = React.useState(false);
  const form = React.useRef(null);
  const after = React.useRef(null);
  const opener = React.useRef(null);
  const { busy, run } = useActionRun('save');
  // The Sheet has no trigger of its own, so it keeps what opened it and gives the focus back there
  // — or, when that button is gone (an empty section's, after a save), to its section's first.
  React.useEffect(() => { if (open) { const a = document.activeElement; opener.current = a && a !== document.body ? { el: a, section: a.closest('.section-anchor') } : null; } }, [open]);
  const giveBack = (e) => {
    const o = opener.current; if (!o) return;
    e.preventDefault();
    setTimeout(() => { const t = o.el.isConnected ? o.el : o.section && o.section.querySelector('button, a[href]'); if (t) t.focus(); });
  };
  // `then`: where a link inside the Sheet leads once it has closed (prices → «أضف وردية», S4).
  const finish = () => { onClose(); const f = after.current; after.current = null; if (f) setTimeout(f, 60); };
  const close = (then) => { after.current = typeof then === 'function' ? then : null; if (dirty) setAsk(true); else finish(); };
  const submit = (e) => {
    e.preventDefault();
    const ok = onSave(false);
    if (!ok) { setTimeout(() => { const bad = form.current && form.current.querySelector('[aria-invalid="true"]'); if (bad) bad.focus(); }); return; }
    run(() => { onSave(true); onClose(); }, tr('حُفظ القسم، ويظهر للزوار الآن', 'Saved — visitors see it now'));
  };
  return (
    <PSheet open={open} onOpenChange={(o) => { if (!o && !ask) close(); }}>
      {/* The layer hears Escape first (on the document, while capturing): during a keyboard move it is
          the move's own Escape, which puts the item back (usePfReorder), so the Sheet lets it pass. */}
      <PSheetContent side="end" className="w-full max-w-2xl" closeLabel={tr('رجوع', 'Back')} onCloseAutoFocus={giveBack}
        onEscapeKeyDown={(e) => { const t = document.activeElement; if (t && t.closest('[data-lifted]')) e.preventDefault(); }}>
        <PSheetHeader><PSheetTitle>{title}</PSheetTitle>{description ? <PSheetDescription>{description}</PSheetDescription> : <PSheetDescription className="sr-only">{title}</PSheetDescription>}</PSheetHeader>
        <form ref={form} onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <PSheetBody className="flex min-w-0 flex-col gap-5 py-2">
            <ActionAlert for="save" />
            {typeof children === 'function' ? children(close) : children}
          </PSheetBody>
          <PSheetFooter className="flex-row gap-2 border-t border-border">
            <PButton type="submit" loading={busy}>{tr('حفظ', 'Save')}</PButton>
            <PButton type="button" variant="outline" onClick={() => close()}>{tr('رجوع', 'Back')}</PButton>
          </PSheetFooter>
        </form>
        <PAlert open={ask} onOpenChange={setAsk}>
          {/* «رجوع» gives the focus back to the Sheet's «حفظ»; a discard closes the Sheet, whose layer
              then returns it to «تعديل». */}
          <PAlertContent onCloseAutoFocus={(e) => { e.preventDefault(); const b = form.current && form.current.querySelector('button[type=submit]'); if (b) b.focus(); }}>
            <PAlertHeader>
              <PAlertTitle>{tr('تجاهل التغييرات؟', 'Discard the changes?')}</PAlertTitle>
              <PAlertDescription>{tr('لم تُحفظ تغييراتك في هذا القسم، وستُفقد.', 'Your changes to this section aren’t saved, and will be lost.')}</PAlertDescription>
            </PAlertHeader>
            <PAlertFooter>
              <PAlertCancel>{tr('رجوع', 'Back')}</PAlertCancel>
              <PAlertAction variant="destructive" onClick={() => { setAsk(false); finish(); }}>{tr('تجاهل التغييرات', 'Discard changes')}</PAlertAction>
            </PAlertFooter>
          </PAlertContent>
        </PAlert>
      </PSheetContent>
    </PSheet>
  );
}

// A Sheet's draft: a copy of the section's value, dirty once it differs. `errors` are shown after
// the first «حفظ», and follow the draft from then on.
// `dirty` compares with the copy taken when the Sheet opened, so a Sheet that starts with an empty
// row (R7) is not "changed" until something is typed.
function usePfDraft(open, value) {
  const [v, setV] = React.useState(value);
  const [base, setBase] = React.useState(value);
  const [tried, setTried] = React.useState(false);
  React.useEffect(() => { if (open) { const copy = JSON.parse(JSON.stringify(value)); setV(copy); setBase(copy); setTried(false); } }, [open]);
  const dirty = open && JSON.stringify(v) !== JSON.stringify(base);
  return { v, setV, set: (p) => setV((x) => Object.assign({}, x, p)), dirty, tried, setTried };
}

// ---------------------------------------------------------------------------------------------
// Reordering (P4, C2): native drag and drop for a mouse, and the keyboard's own mode — Space lifts
// the focused item, the arrows move it, Space drops it, Escape puts it back — each step said in a
// live region. Touch dragging is the production library's (an approved dependency).
// ---------------------------------------------------------------------------------------------
function usePfReorder({ ids, onChange, onDrop, nameOf, grid }) {
  const [lifted, setLifted] = React.useState(null);
  const [over, setOver] = React.useState(null);
  const [said, say] = React.useState('');
  const dragged = React.useRef(null);
  const before = React.useRef(null);
  const nodes = React.useRef({});
  // The item keeps the focus as it moves; a row whose keyboard grip is a handle focuses the handle.
  const refocus = (id) => requestAnimationFrame(() => { const el = nodes.current[id]; const t = el && (el.querySelector('[data-handle]') || el); if (t) t.focus(); });
  const place = (i, n) => tr(`المكان ${i + 1} من ${n}`, `position ${i + 1} of ${n}`);
  const moveTo = (id, to) => { const l = ids.filter((x) => x !== id); l.splice(to, 0, id); onChange(l); return l; };
  const key = (id) => (e) => {
    if (e.target !== e.currentTarget) return;
    const i = ids.indexOf(id);
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      if (lifted === null) { before.current = ids.slice(); setLifted(id); say(tr(`رُفعت ${nameOf(id)}، ${place(i, ids.length)}. حرّكها بالأسهم، ثم اضغط مسافة لوضعها، أو Escape للإلغاء.`, `${nameOf(id)} lifted, ${place(i, ids.length)}. Move it with the arrow keys, then press Space to drop it, or Escape to cancel.`)); }
      else { setLifted(null); say(tr(`وُضعت ${nameOf(id)} في ${place(i, ids.length)}.`, `${nameOf(id)} dropped at ${place(i, ids.length)}.`)); if (before.current.join() !== ids.join()) onDrop(ids, id); }
      return;
    }
    if (lifted !== id) return;
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      onChange(before.current); setLifted(null);
      say(tr(`أُلغي النقل. عادت ${nameOf(id)} إلى ${place(before.current.indexOf(id), ids.length)}.`, `Move cancelled. ${nameOf(id)} is back at ${place(before.current.indexOf(id), ids.length)}.`));
      refocus(id); return;
    }
    // In a grid the row's direction follows the language; in a list only up and down move.
    const ltr = document.documentElement.dir !== 'rtl';
    const step = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: grid ? (ltr ? -1 : 1) : 0, ArrowRight: grid ? (ltr ? 1 : -1) : 0, Home: -ids.length, End: ids.length }[e.key];
    if (step === undefined || step === 0) return;
    e.preventDefault();
    const to = Math.max(0, Math.min(ids.length - 1, i + step));
    if (to === i) { say(place(i, ids.length)); return; }
    moveTo(id, to);
    say(tr(`${nameOf(id)}: ${place(to, ids.length)}`, `${nameOf(id)}: ${place(to, ids.length)}`));
    refocus(id);
  };
  const itemProps = (id) => ({
    ref: (el) => { nodes.current[id] = el; },
    draggable: true,
    'data-sortable': '',
    'data-lifted': lifted === id ? '' : undefined,
    'data-over': over === id && dragged.current !== id ? '' : undefined,
    onDragStart: (e) => { dragged.current = id; before.current = ids.slice(); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', id); } catch (x) { /* old browsers */ } },
    onDragOver: (e) => { if (dragged.current === null) return; e.preventDefault(); if (over !== id) setOver(id); },
    onDragLeave: () => { if (over === id) setOver(null); },
    onDrop: (e) => { e.preventDefault(); const from = dragged.current; setOver(null); dragged.current = null; if (from === null || from === id) return; const l = moveTo(from, ids.indexOf(id)); onDrop(l, from); },
    onDragEnd: () => { dragged.current = null; setOver(null); },
    onBlur: (e) => { if (lifted === id && e.relatedTarget && !e.currentTarget.contains(e.relatedTarget)) { setLifted(null); if (before.current.join() !== ids.join()) onDrop(ids, id); } }
  });
  return { itemProps, key, lifted, said };
}

// ---------------------------------------------------------------------------------------------
// The header (H1–H4, M2): a summary, never a section — no «تعديل».
// ---------------------------------------------------------------------------------------------
// A photo's picture: the uploaded file, or the drawn stand-in (the product shows the space's own).
const PfPhoto = ({ p, className }) => (
  <div className={'relative overflow-hidden bg-muted ' + (className || '')}>
    {p.url ? <img src={p.url} alt="" className="size-full object-cover" /> : <CoverArt seed={p.seed} />}
  </div>
);
function PfHeader({ d, admin, publicHref, onAddCover, readOnly }) {
  const cover = d.photos.find((p) => p.state === 'done');
  const name = tr(d.about.nameAr || d.about.nameEn, d.about.nameEn);
  const area = window.MASAHA.findArea(d.location.area);
  const gov = window.MASAHA.areaGov(d.location.area);
  const done = PF_COUNTED.filter((k) => pfFilled(k, d)).length;
  const names = Object.fromEntries(PF_SECTIONS());
  const issues = PF_COUNTED.filter((k) => pfState(k, d) !== 'ok');
  const copy = () => {
    const url = location.origin + '/' + (publicHref || '');
    const said = () => ptoast.success(tr('نُسخ رابط الصفحة العامة', 'Public page link copied'));
    try { navigator.clipboard.writeText(url).then(said, said); } catch (e) { said(); }
  };
  const verified = admin ? admin.verified : true;
  return (
    <PCard aria-labelledby="pf-name">
      <PCardContent className="pf-hdr">
        <div className="pf-hdr-cover relative overflow-hidden rounded-lg bg-muted">
          {cover ? <PfPhoto p={cover} className="size-full" /> : (
            <div className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center">
              <span className="text-heading-2 text-primary" aria-hidden="true">{(d.about.nameEn || '?').charAt(0)}</span>
              {!readOnly && <a href="#photos" onClick={onAddCover} className="pf-hdr-add hidden text-caption md:block">{tr('أضف صورة غلاف', 'Add a cover photo')}</a>}
            </div>
          )}
        </div>
        <div className="pf-hdr-name flex min-w-0 flex-col gap-1">
          <h2 id="pf-name" className="text-heading-2 md:text-heading-1" lang={!d.about.nameAr || LANG === 'en' ? 'en' : undefined}>{name}</h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-muted-foreground">
            <span>{area ? tr(area.ar, area.en) : ''}{gov ? tr('، ', ', ') + gov.name.replace('محافظة ', '') : ''}</span>
            <span aria-hidden="true">·</span>
            {verified ? <PBadge variant="success">{tr('موثّقة', 'Verified')}</PBadge> : <PBadge variant="warning">{tr('غير موثّقة', 'Unverified')}</PBadge>}
            {admin && admin.hidden && <PBadge variant="neutral">{tr('مخفية عن الزوار', 'Hidden from visitors')}</PBadge>}
          </p>
          {/* The phone's 64 px tile holds the letter only; its link sits under the name (M2). */}
          {!cover && !readOnly && <a href="#photos" onClick={onAddCover} className="text-body-sm md:hidden">{tr('أضف صورة غلاف', 'Add a cover photo')}</a>}
        </div>
        <div className="pf-hdr-acts grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-start">
          <PButton variant="outline" size="sm" asChild><a href={publicHref} target="_blank" rel="noopener"><PEye />{tr('عرض الصفحة العامة', 'View public page')}</a></PButton>
          <PButton variant="outline" size="sm" type="button" onClick={copy}>{tr('نسخ الرابط', 'Copy link')}</PButton>
        </div>
        <div className="pf-hdr-bar flex flex-col gap-2 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-label" id="pf-complete">{tr('اكتمال الملف', 'Profile completeness')}</span>
            <span className="text-body-sm text-muted-foreground">{tr(`${done} من 7 أقسام`, `${done} of 7 sections`)}</span>
          </div>
          <div className="upload-bar pf-meter" role="progressbar" aria-labelledby="pf-complete" aria-valuemin={0} aria-valuemax={7} aria-valuenow={done} aria-valuetext={tr(`${done} من 7 أقسام`, `${done} of 7 sections`)}><span style={{ width: (done / 7) * 100 + '%' }} /></div>
          {issues.length ? (
            <p className="flex flex-wrap gap-x-2 gap-y-1 text-body-sm">
              {issues.map((k, i) => (
                <React.Fragment key={k}>
                  {i > 0 && <span className="text-muted-foreground" aria-hidden="true">·</span>}
                  <a href={'#' + k}>{names[k]}{tr(': ', ': ')}{pfState(k, d) === 'missing' ? tr('لم تُضف بعد', 'not added yet') : tr('قد تكون قديمة', 'may be out of date')}</a>
                </React.Fragment>
              ))}
            </p>
          ) : <p className="text-body-sm text-success">{tr('الملف مكتمل ومحدّث', 'The profile is complete and up to date')}</p>}
        </div>
      </PCardContent>
    </PCard>
  );
}

// ---------------------------------------------------------------------------------------------
// The side index (G3): desktop only, each section with its state's dot; none on a phone.
// ---------------------------------------------------------------------------------------------
function useCurrentSection(ids) {
  const [current, setCurrent] = React.useState(ids[0]);
  const hold = React.useRef(0);
  React.useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (Date.now() < hold.current) return;
      let c = ids[0];
      for (const id of ids) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= 96) c = id; }
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
const PF_DOT = () => ({ ok: ['bg-success', tr('مكتمل', 'Complete')], stale: ['bg-warning', tr('قد تكون قديمة', 'May be out of date')], missing: ['bg-destructive', tr('لم تُضف بعد', 'Not added yet')], optional: ['bg-border', tr('اختياري', 'Optional')] });
function PfIndex({ d }) {
  const wide = useIsDesktop();
  const sections = PF_SECTIONS();
  const [current, choose] = useCurrentSection(sections.map(([id]) => id));
  if (!wide) return null;
  return (
    <nav aria-label={tr('أقسام الملف', 'Profile sections')} className="profile-toc lg:col-span-3 lg:flex lg:flex-col lg:gap-1">
      {sections.map(([id, label]) => {
        const [dot, said] = PF_DOT()[pfState(id, d)];
        const on = current === id;
        return (
          <PButton key={id} variant={on ? 'secondary' : 'ghost'} size="sm" className="w-full justify-between" aria-current={on ? 'location' : undefined} asChild>
            <a href={'#' + id} onClick={() => choose(id)}>
              <span>{label}</span>
              <span className="flex items-center gap-2"><span className="sr-only">{said}</span><span className={'pf-dot size-2.5 shrink-0 rounded-full ' + dot} aria-hidden="true" /></span>
            </a>
          </PButton>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------------------------
// الصور (P1–P7, M1): no Sheet — «إدارة الصور» turns the section into its edit state, «تم» back.
// ---------------------------------------------------------------------------------------------
const PHOTO_LIMIT = 10;
const MAX_BYTES = 4 * 1024 * 1024;
const pfPhotoName = (p) => tr('صورة ', 'Photo ') + p.n;
const pfPhotosLine = (n) => tr(n === 1 ? 'صورة واحدة' : n === 2 ? 'صورتان' : n <= 10 ? `${n} صور` : `${n} صورة`, n === 1 ? '1 photo' : `${n} photos`);

function PfPhotosView({ photos }) {
  const wide = useIsTablet();
  const n = photos.length;
  const cover = photos[0];
  const rest = photos.slice(1);
  if (!wide) {
    // M1: the cover 16:9 with «الغلاف» and the count, then one row of small thumbnails.
    return (
      <div className="flex flex-col gap-2">
        <div className="relative">
          <PfPhoto p={cover} className="aspect-video w-full rounded-lg" />
          <span className="photo-cover"><PBadge variant="primary">{tr('الغلاف', 'Cover')}</PBadge></span>
          <span className="pf-count"><PBadge variant="neutral">{pfPhotosLine(n)}</PBadge></span>
        </div>
        {rest.length > 0 && <ul className="pf-strip flex gap-2 overflow-x-auto" aria-label={tr('باقي الصور', 'The other photos')}>
          {rest.map((p) => <li key={p.id} className="pf-thumb"><PfPhoto p={p} className="size-full rounded-md" /><span className="sr-only">{pfPhotoName(p)}</span></li>)}
        </ul>}
      </div>
    );
  }
  // P1: the cover about two thirds wide beside a 2×2 grid; past five, the last tile says «+N».
  const tiles = rest.slice(0, 4);
  const more = n > 5 ? n - 5 : 0;
  return (
    <div className="gallery-h grid grid-cols-3 gap-2">
      <div className={'relative ' + (tiles.length ? 'col-span-2' : 'col-span-3')}>
        <PfPhoto p={cover} className="size-full rounded-lg" />
        <span className="photo-cover"><PBadge variant="primary">{tr('الغلاف', 'Cover')}</PBadge></span>
      </div>
      {tiles.length > 0 && <div className="pf-grid2 grid grid-cols-2 gap-2">
        {tiles.map((p, i) => (
          <div key={p.id} className="relative">
            <PfPhoto p={p} className="size-full rounded-md" />
            {i === 3 && more > 0 && <span className="pf-more flex items-center justify-center rounded-md text-heading-3" aria-label={tr(`و${more} صور أخرى`, `and ${more} more`)}><Ltr>+{more}</Ltr></span>}
          </div>
        ))}
      </div>}
    </div>
  );
}

function PfPhotosSection({ d, api, readOnly, editing, setEditing }) {
  const [removing, setRemoving] = React.useState(null);
  const [leftOut, setLeftOut] = React.useState(0);
  const input = React.useRef(null);
  const delBtn = React.useRef(null);
  const failNext = React.useRef(actionFails('upload'));
  const next = React.useRef(100);
  const photos = d.photos;
  const done = photos.filter((p) => p.state === 'done');
  const counted = photos.filter((p) => p.state === 'done' || p.state === 'uploading').length;
  const full = counted >= PHOTO_LIMIT;
  const patch = (id, p) => api.photos((l) => l.map((t) => (t.id === id ? Object.assign({}, t, p) : t)));
  const byId = Object.fromEntries(photos.map((p) => [p.id, p]));
  // The server's answer is a frame here: ?fail=upload fails the first upload as a lost connection.
  const upload = (id) => {
    patch(id, { state: 'uploading', progress: 0 });
    let progress = 0;
    const timer = setInterval(() => {
      progress += 20;
      if (progress < 100) { patch(id, { progress }); return; }
      clearInterval(timer);
      if (failNext.current) { failNext.current = false; patch(id, { state: 'failed' }); return; }
      patch(id, { state: 'done' });
    }, 160);
  };
  // P3: several at once; a refused file says why under it and takes no place; the others go on.
  const choose = (files) => {
    let room = PHOTO_LIMIT - counted, out = 0;
    const added = [];
    Array.from(files).forEach((f) => {
      const why = !/^image\/(jpeg|png|webp)$/.test(f.type) ? tr('ليست JPEG أو PNG أو WebP', 'Not a JPEG, PNG or WebP') : f.size > MAX_BYTES ? tr('أكبر من 4 ميجابايت', 'Larger than 4 MB') : null;
      if (!why && room <= 0) { out++; return; }
      if (!why) room--;
      const n = next.current++;
      added.push({ id: 'u' + n, n: photos.length + added.length + 1, file: f.name, url: why ? null : URL.createObjectURL(f), state: why ? 'rejected' : 'uploading', why, progress: 0 });
    });
    setLeftOut(out);
    api.photos((l) => l.concat(added));
    added.filter((t) => t.state === 'uploading').forEach((t) => upload(t.id));
  };
  const drop = (id) => api.photos((l) => l.filter((x) => x.id !== id));
  const doneIds = done.map((p) => p.id);
  const sort = usePfReorder({
    ids: doneIds, grid: true, nameOf: (id) => pfPhotoName(byId[id]),
    // Only the photos that are up are ordered; the uploads in progress keep their places after them.
    onChange: (ids) => api.photos((l) => ids.map((id) => l.find((p) => p.id === id)).concat(l.filter((p) => p.state !== 'done'))),
    onDrop: (ids, id) => ptoast.success(ids[0] === id ? tr(`${pfPhotoName(byId[id])} هي الغلاف الآن`, `${pfPhotoName(byId[id])} is the cover now`) : tr('حُفظ الترتيب', 'Order saved'))
  });
  const count = tr(`${done.length} من 10 صور`, `${done.length} of 10 photos`);
  const head = readOnly || !done.length && !editing ? null : editing
    ? <PButton type="button" size="sm" onClick={() => setEditing(false)}>{tr('تم', 'Done')}</PButton>
    : <PButton type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>{tr('إدارة الصور', 'Manage photos')}</PButton>;
  const empty = { text: tr('لم تُضف صور بعد.', 'No photos yet.'), hint: tr('أول صورة تكون غلاف مساحتك في الدليل.', 'The first photo is your space’s cover in the directory.'), action: tr('أضف صورًا', 'Add photos'), onAction: () => setEditing(true) };
  return (
    <PfSection id="photos" title={tr('الصور', 'Photos')} d={d} api={api} count={count} readOnly={readOnly} headAction={head} empty={editing ? null : empty}>
      {!editing ? (done.length ? <PfPhotosView photos={done} /> : null) : (
        <div className="flex flex-col gap-4">
          <div className="pf-drop flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
            {full
              ? <p className="text-body-sm">{tr('وصلت الحد الأقصى (10 صور). احذف صورة لتضيف غيرها.', 'You’ve reached the limit (10 photos). Delete one to add another.')}</p>
              : <>
                  <PButton type="button" onClick={() => input.current.click()}>{tr('اختر صورًا', 'Choose photos')}</PButton>
                  <span className="text-caption text-muted-foreground">{tr('حتى 10 صور · JPEG أو PNG أو WebP · حتى 4 ميجابايت للصورة', 'Up to 10 photos · JPEG, PNG or WebP · up to 4 MB each')}</span>
                </>}
          </div>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { choose(e.target.files || []); e.target.value = ''; }} />
          {leftOut > 0 && <p className="text-caption text-destructive">{tr(`لم تُضف ${leftOut === 1 ? 'صورة واحدة' : leftOut === 2 ? 'صورتان' : leftOut + ' صور'}: الحد 10 صور.`, `${leftOut} left out: the limit is 10 photos.`)}</p>}
          {done.length > 1 && <p className="text-caption text-muted-foreground" id="pf-photo-hint">{tr('اسحب صورة إلى الأول لتصبح الغلاف. بلوحة المفاتيح: اختر الصورة، اضغط مسافة لرفعها، حرّكها بالأسهم، ثم مسافة لوضعها.', 'Drag a photo to the first place to make it the cover. With the keyboard: focus a photo, press Space to lift it, move it with the arrow keys, then Space to drop it.')}</p>}
          <p className="sr-only" aria-live="assertive">{sort.said}</p>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4" aria-label={tr('الصور بترتيبها', 'The photos, in order')}>
            {done.map((p, i) => (
              <li key={p.id} {...sort.itemProps(p.id)} tabIndex={0} onKeyDown={sort.key(p.id)} aria-describedby={done.length > 1 ? 'pf-photo-hint' : undefined}
                aria-label={pfPhotoName(p) + (i === 0 ? tr('، الغلاف', ', the cover') : '') + tr(`، المكان ${i + 1} من ${done.length}`, `, position ${i + 1} of ${done.length}`)}
                className="pf-tile relative overflow-hidden rounded-lg">
                <PfPhoto p={p} className="photo-thumb w-full" />
                {i === 0 && <span className="photo-cover"><PBadge variant="primary">{tr('الغلاف', 'Cover')}</PBadge></span>}
                <PButton type="button" variant="outline" size="icon" className="pf-del bg-card" aria-label={tr('حذف ', 'Delete ') + pfPhotoName(p)} onClick={(e) => { delBtn.current = e.currentTarget; setRemoving(p); }}><PX /></PButton>
              </li>
            ))}
            {photos.filter((p) => p.state !== 'done').map((p) => (
              <li key={p.id} className="flex flex-col gap-2 rounded-lg border border-border p-2">
                <div className="photo-thumb relative flex items-center justify-center overflow-hidden rounded-md bg-muted text-caption text-muted-foreground">
                  {p.url ? <img src={p.url} alt="" className="size-full object-cover" /> : <span dir="auto" className="truncate px-2">{p.file || pfPhotoName(p)}</span>}
                </div>
                {p.state === 'uploading' && <div className="flex flex-col gap-1">
                  <div className="upload-bar" role="progressbar" aria-label={tr('رفع ', 'Uploading ') + (p.file || pfPhotoName(p))} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.progress}><span style={{ width: p.progress + '%' }} /></div>
                  <span className="text-caption text-muted-foreground">{tr('جارٍ الرفع… ', 'Uploading… ')}<Ltr>{p.progress}%</Ltr></span>
                </div>}
                {p.state === 'failed' && <div className="flex flex-col gap-1">
                  <p className="text-caption text-destructive">{tr('لم تُرفع: انقطع الاتصال.', 'Not uploaded: the connection dropped.')}</p>
                  <div className="flex flex-wrap gap-1"><PButton type="button" variant="outline" size="sm" disabled={full} onClick={() => upload(p.id)}>{tr('إعادة المحاولة', 'Try again')}</PButton><PButton type="button" variant="ghost" size="sm" onClick={() => drop(p.id)}>{tr('إزالة', 'Remove')}</PButton></div>
                </div>}
                {p.state === 'rejected' && <div className="flex flex-col gap-1">
                  <p className="text-caption text-destructive">{tr('لم تُرفع: ', 'Not uploaded: ')}{p.why}</p>
                  <div><PButton type="button" variant="ghost" size="sm" onClick={() => drop(p.id)}>{tr('إزالة', 'Remove')}</PButton></div>
                </div>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <PAlert open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        {/* «رجوع» returns the focus to the photo's delete button; once deleted, its tile is gone, so the
            focus goes to the first photo, or to «اختر صورًا». */}
        <PAlertContent onCloseAutoFocus={(e) => { e.preventDefault(); setTimeout(() => { const sec = document.getElementById('photos'); const t = delBtn.current && delBtn.current.isConnected ? delBtn.current : sec && (sec.querySelector('[data-sortable]') || sec.querySelector('button')); if (t) t.focus(); }); }}>
          <PAlertHeader>
            <PAlertTitle>{tr('حذف هذه الصورة؟', 'Delete this photo?')}</PAlertTitle>
            <PAlertDescription>{tr('تختفي من صفحة المساحة فورًا، ولا يمكن استرجاعها.', 'It leaves the space’s page at once, and can’t be brought back.')}{removing && done[0] && removing.id === done[0].id && done.length > 1 ? tr(' الصورة التالية تصبح الغلاف.', ' The next photo becomes the cover.') : ''}</PAlertDescription>
          </PAlertHeader>
          <PAlertFooter>
            <PAlertCancel>{tr('رجوع', 'Back')}</PAlertCancel>
            <PAlertAction variant="destructive" onClick={() => { drop(removing.id); ptoast.success(tr('حُذفت الصورة', 'Photo deleted')); }}>{tr('حذف', 'Delete')}</PAlertAction>
          </PAlertFooter>
        </PAlertContent>
      </PAlert>
    </PfSection>
  );
}

Object.assign(window, { FACT_GROUPS, ago, SectionTitle, Optional, STRIP, fmtCoords, latinDigits, parseCoords, coordsError, errorsOf, basicsErrors, locationErrors, AreaSelect, BasicsFields, LocationFields, sampleProfile, DAYS, toMin, publish, useStored, SHIFT_LIMIT, LimitNote, shiftCheck, SAMPLE_SHIFTS, PF_GROUP, PF_SECTIONS, PF_COUNTED, pfFilled, pfState, usePfStore, PfSection, PfEmpty, PfSheet, usePfDraft, usePfReorder, PfPhoto, PfHeader, PfIndex, PfPhotosSection, pfUpdated });
