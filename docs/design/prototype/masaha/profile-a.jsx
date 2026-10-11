const { Card: PCard, CardHeader: PCardHeader, CardTitle: PCardTitle, CardDescription: PCardDescription, CardAction: PCardAction, CardContent: PCardContent, CardFooter: PCardFooter, Button: PButton, Badge: PBadge, Field: PField, Input: PInput, Textarea: PTextarea, Select: PSelect, SelectTrigger: PSelectTrigger, SelectValue: PSelectValue, SelectContent: PSelectContent, SelectItem: PSelectItem, SelectGroup: PSelectGroup, SelectLabel: PSelectLabel, Switch: PSwitch, Alert: PAlert, AlertDescription: PAlertDescription, XIcon: PX, toast: ptoast } = window.MasahaDesignSystem;

// Each section saves on its own; dirty sections register so leaving the page warns.
const dirtySet = new Set();
window.addEventListener('beforeunload', (e) => { if (dirtySet.size) { e.preventDefault(); e.returnValue = ''; } });
function useSection(id, initial) {
  const [v, setV] = React.useState(initial);
  const [saved, setSaved] = React.useState(initial);
  const [updated, setUpdated] = React.useState(null);
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);
  React.useEffect(() => { dirty ? dirtySet.add(id) : dirtySet.delete(id); window.dispatchEvent(new Event('masaha-dirty')); }, [dirty]);
  const save = () => { setSaved(v); setUpdated(tr('الآن', 'just now')); ptoast.success(tr('حُفظ القسم', 'Section saved')); };
  return { v, setV, set: (p) => setV((x) => ({ ...x, ...p })), dirty, save, reset: () => setV(saved), updated, touch: () => { setUpdated(tr('الآن', 'just now')); ptoast.success(tr('أكّدنا أن المعلومات ما زالت صحيحة', 'Confirmed as still correct')); } };
}

// `validate` answers one line for the section's Alert, or { field: line } for the fields
// themselves (then `children` is a function of those errors, and the first takes the focus).
function ProfileSection({ id, title, description, updated, sec, children, validate, footerExtra }) {
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
  return (
    <PCard id={id} className="scroll-mt-20">
      <PCardHeader>
        <PCardTitle>{title}</PCardTitle>
        <PCardDescription>{description ? <>{description} · </> : null}{tr('آخر تحديث', 'Updated')} {sec.updated || updated}</PCardDescription>
        {sec.dirty && <PCardAction><PBadge variant="warning">{tr('تغييرات غير محفوظة', 'Unsaved changes')}</PBadge></PCardAction>}
      </PCardHeader>
      <form ref={form} onSubmit={submit} noValidate className="flex flex-col gap-(--card-padding)">
        <PCardContent className="flex flex-col gap-5">
          {typeof err === 'string' && <PAlert variant="destructive"><PAlertDescription>{err}</PAlertDescription></PAlert>}
          <ActionAlert for="save" />
          {typeof children === 'function' ? children(fieldErrors) : children}
        </PCardContent>
        <PCardFooter className="flex flex-wrap gap-2">
          <PButton type="submit" loading={busy}>{tr('حفظ', 'Save')}</PButton>
          {sec.dirty && <PButton type="button" variant="ghost" onClick={() => { sec.reset(); setErr(null); }}>{tr('تجاهل التغييرات', 'Discard changes')}</PButton>}
          {!sec.dirty && (footerExtra !== undefined ? footerExtra : <PButton type="button" variant="ghost" onClick={sec.touch}>{tr('المعلومات ما زالت صحيحة', 'Still correct')}</PButton>)}
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
const sampleProfile = (space) => ({
  nameAr: space.nameAr || '', nameEn: space.name || '',
  descAr: 'مساحة عمل هادئة للعمل الفردي والدراسة، فيها طاولات مشتركة وزاوية للمكالمات.', descEn: 'A quiet space for solo work and study, with shared desks and a corner for calls.',
  area: space.area || '', addrAr: 'النصر، شارع النصر، عمارة 12، الطابق الثالث', addrEn: 'An-Nasr, An-Nasr Street, Building 12, 3rd floor',
  landmarkAr: 'قرب مفترق العيون', landmarkEn: 'Near Al-Oyoun junction',
  coords: space.lat != null ? fmtCoords(space) : ''
});

function BasicsSection({ space }) {
  const p = sampleProfile(space);
  const sec = useSection('basics', { nameAr: p.nameAr, nameEn: p.nameEn, descAr: p.descAr, descEn: p.descEn });
  return (
    <ProfileSection id="basics" title={tr('الأساسيات', 'Basics')} updated={tr('قبل أسبوعين', '2 weeks ago')} sec={sec} validate={(v) => errorsOf(basicsErrors(v))}>
      {(errors) => <BasicsFields v={sec.v} set={sec.set} errors={errors} />}
    </ProfileSection>
  );
}

function LocationSection({ space }) {
  const p = sampleProfile(space);
  const sec = useSection('location', { area: p.area, addrAr: p.addrAr, addrEn: p.addrEn, landmarkAr: p.landmarkAr, landmarkEn: p.landmarkEn, coords: p.coords, nameEn: p.nameEn });
  return (
    <ProfileSection id="location" title={tr('الموقع', 'Location')} updated={tr('قبل شهر', 'a month ago')} sec={sec} validate={(v) => errorsOf(locationErrors(v))}>
      {(errors) => <LocationFields v={sec.v} set={sec.set} errors={errors} />}
    </ProfileSection>
  );
}

const DAYS = () => window.MASAHA.weekOrder;
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

function HoursSection() {
  const init = { days: Object.fromEntries(DAYS().map(([k]) => [k, k === 'fri' ? { open: false, from: '08:00', to: '18:00' } : { open: true, from: '08:00', to: '18:00' }])), shifts: [{ ar: 'الوردية الصباحية', en: 'Morning shift', from: '08:00', to: '13:00' }, { ar: 'الوردية المسائية', en: 'Evening shift', from: '13:00', to: '18:00' }] };
  if (pageParams.get('demo') === 'shifterror') init.shifts[1].to = '19:30';
  const sec = useSection('hours', init);
  const setDay = (k, p) => sec.set({ days: { ...sec.v.days, [k]: { ...sec.v.days[k], ...p } } });
  const copyAll = (k) => { const d = sec.v.days[k]; sec.set({ days: Object.fromEntries(DAYS().map(([x]) => [x, x === 'fri' ? sec.v.days.fri : { ...d }])) }); };
  const openDays = Object.values(sec.v.days).filter((d) => d.open);
  const minFrom = openDays.length ? Math.min(...openDays.map((d) => toMin(d.from))) : 0;
  const maxTo = openDays.length ? Math.max(...openDays.map((d) => toMin(d.to))) : 0;
  const shiftBad = (s) => toMin(s.from) < minFrom || toMin(s.to) > maxTo || toMin(s.to) <= toMin(s.from);
  const setShift = (i, p) => sec.set({ shifts: sec.v.shifts.map((s, j) => (j === i ? { ...s, ...p } : s)) });
  return (
    <ProfileSection id="hours" title={tr('ساعات العمل', 'Opening hours')} updated={tr('قبل أسبوع', 'a week ago')} sec={sec}
      validate={(v) => (v.shifts.some(shiftBad) ? tr('كل وردية يجب أن تكون داخل ساعات العمل.', 'Each shift must sit inside the opening hours.') : null)}>
      <ul className="flex flex-col divide-y rounded-lg border border-border">
        {DAYS().map(([k, name]) => {
          const d = sec.v.days[k];
          return (
            <li key={k} className="flex flex-col gap-2 px-3 py-3 md:flex-row md:items-center md:gap-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-label">{name}</span>
                <PSwitch checked={d.open} onCheckedChange={(o) => setDay(k, { open: o })} aria-label={tr('مفتوحة يوم ', 'Open on ') + name} />
              </div>
              {d.open ? (
                <div className="flex flex-wrap items-center gap-2">
                  <TimeInput aria-label={tr('من', 'From')} value={d.from} onChange={(v) => setDay(k, { from: v })} className="w-24" />
                  <span className="text-muted-foreground" aria-hidden="true">–</span>
                  <TimeInput aria-label={tr('إلى', 'To')} value={d.to} onChange={(v) => setDay(k, { to: v })} className="w-24" />
                  {k === 'sat' && <PButton type="button" variant="link" size="sm" onClick={() => copyAll('sat')}>{tr('نسخ إلى كل الأيام', 'Copy to all days')}</PButton>}
                </div>
              ) : <span className="text-body-sm text-muted-foreground">{tr('مغلقة', 'Closed')}</span>}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-label">{tr('الورديات', 'Shifts')}</span>
          <span className="text-caption text-muted-foreground">{tr('اختيارية، وتكون داخل ساعات العمل.', 'Optional, and inside the opening hours.')}</span>
        </div>
        {sec.v.shifts.map((s, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-4"><PField label={tr('الاسم بالعربية', 'Name in Arabic')}><PInput lang="ar" dir="rtl" value={s.ar} onChange={(e) => setShift(i, { ar: e.target.value })} /></PField></div>
            <div className="md:col-span-3"><PField label={tr('الاسم بالإنجليزية', 'Name in English')}><PInput lang="en" dir="ltr" value={s.en} onChange={(e) => setShift(i, { en: e.target.value })} /></PField></div>
            <div className="md:col-span-4"><PField label={tr('من – إلى', 'From – to')} error={shiftBad(s) ? tr('خارج ساعات العمل', 'Outside opening hours') : undefined}>
              <div className="flex items-center gap-2">
                <TimeInput aria-label={tr('من', 'From')} value={s.from} onChange={(v) => setShift(i, { from: v })} />
                <TimeInput aria-label={tr('إلى', 'To')} value={s.to} onChange={(v) => setShift(i, { to: v })} />
              </div>
            </PField></div>
            <div className="md:col-span-1 md:flex md:justify-end"><PButton type="button" variant="ghost" size="icon" aria-label={tr('حذف الوردية', 'Remove shift')} onClick={() => sec.set({ shifts: sec.v.shifts.filter((_, j) => j !== i) })}><PX /></PButton></div>
          </div>
        ))}
        <PButton type="button" variant="outline" className="self-start" onClick={() => sec.set({ shifts: [...sec.v.shifts, { ar: '', en: '', from: '08:00', to: '13:00' }] })}>{tr('إضافة وردية', 'Add shift')}</PButton>
      </div>
    </ProfileSection>
  );
}

Object.assign(window, { useSection, ProfileSection, BasicsSection, LocationSection, HoursSection, dirtySet, Optional, BasicsFields, LocationFields, AreaSelect, parseCoords, fmtCoords, coordsError, errorsOf, basicsErrors, locationErrors, sampleProfile });
