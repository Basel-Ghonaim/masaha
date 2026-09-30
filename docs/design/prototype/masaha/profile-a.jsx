const { Card: PCard, CardHeader: PCardHeader, CardTitle: PCardTitle, CardDescription: PCardDescription, CardAction: PCardAction, CardContent: PCardContent, CardFooter: PCardFooter, Button: PButton, Badge: PBadge, Field: PField, Input: PInput, Textarea: PTextarea, Select: PSelect, SelectTrigger: PSelectTrigger, SelectValue: PSelectValue, SelectContent: PSelectContent, SelectItem: PSelectItem, Switch: PSwitch, Alert: PAlert, AlertDescription: PAlertDescription, XIcon: PX, toast: ptoast } = window.MasahaDesignSystem;

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

function ProfileSection({ id, title, description, updated, sec, children, validate, footerExtra }) {
  const [err, setErr] = React.useState(null);
  const submit = (e) => { e.preventDefault(); const m = validate ? validate(sec.v) : null; setErr(m); if (!m) sec.save(); };
  return (
    <PCard id={id} className="scroll-mt-20">
      <PCardHeader>
        <PCardTitle>{title}</PCardTitle>
        <PCardDescription>{description ? <>{description} · </> : null}{tr('آخر تحديث', 'Updated')} {sec.updated || updated}</PCardDescription>
        {sec.dirty && <PCardAction><PBadge variant="warning">{tr('تغييرات غير محفوظة', 'Unsaved changes')}</PBadge></PCardAction>}
      </PCardHeader>
      <form onSubmit={submit} noValidate>
        <PCardContent className="flex flex-col gap-5">
          {err && <PAlert variant="destructive"><PAlertDescription>{err}</PAlertDescription></PAlert>}
          {children}
        </PCardContent>
        <PCardFooter className="flex flex-wrap gap-2">
          <PButton type="submit" disabled={!sec.dirty}>{tr('حفظ', 'Save')}</PButton>
          {sec.dirty && <PButton type="button" variant="ghost" onClick={() => { sec.reset(); setErr(null); }}>{tr('تجاهل التغييرات', 'Discard changes')}</PButton>}
          {!sec.dirty && (footerExtra !== undefined ? footerExtra : <PButton type="button" variant="ghost" onClick={sec.touch}>{tr('المعلومات ما زالت صحيحة', 'Still correct')}</PButton>)}
        </PCardFooter>
      </form>
    </PCard>
  );
}

const Bi = ({ children }) => <div className="grid gap-4 md:grid-cols-2">{children}</div>;

function BasicsSection({ space }) {
  const sec = useSection('basics', { nameAr: space.nameAr, nameEn: space.name, descAr: 'مساحة عمل هادئة للعمل الفردي والدراسة، فيها طاولات مشتركة وزاوية للمكالمات.', descEn: 'A quiet space for solo work and study, with shared desks and a corner for calls.' });
  return (
    <ProfileSection id="basics" title={tr('الأساسيات', 'Basics')} updated={tr('قبل أسبوعين', '2 weeks ago')} sec={sec} validate={(v) => (!v.nameAr.trim() || !v.nameEn.trim() ? tr('أدخل الاسم بالعربية والإنجليزية.', 'Enter the name in Arabic and English.') : null)}>
      <Bi>
        <PField label={tr('الاسم بالعربية', 'Name in Arabic')}><PInput lang="ar" dir="rtl" value={sec.v.nameAr} onChange={(e) => sec.set({ nameAr: e.target.value })} /></PField>
        <PField label={tr('الاسم بالإنجليزية', 'Name in English')}><PInput lang="en" dir="ltr" value={sec.v.nameEn} onChange={(e) => sec.set({ nameEn: e.target.value })} /></PField>
      </Bi>
      <Bi>
        <PField label={tr('الوصف بالعربية', 'Description in Arabic')}><PTextarea lang="ar" dir="rtl" rows={3} value={sec.v.descAr} onChange={(e) => sec.set({ descAr: e.target.value })} /></PField>
        <PField label={tr('الوصف بالإنجليزية', 'Description in English')}><PTextarea lang="en" dir="ltr" rows={3} value={sec.v.descEn} onChange={(e) => sec.set({ descEn: e.target.value })} /></PField>
      </Bi>
    </ProfileSection>
  );
}

function LocationSection({ space }) {
  const M = window.MASAHA;
  const sec = useSection('location', { area: space.area, addrAr: 'النصر، شارع النصر، عمارة 12، الطابق الثالث', addrEn: 'An-Nasr, An-Nasr Street, Building 12, 3rd floor', landmark: tr('قرب مفترق العيون', 'Near Al-Oyoun junction'), lat: space.lat, lng: space.lng });
  const areas = M.governorates[0].areas;
  return (
    <ProfileSection id="location" title={tr('الموقع', 'Location')} updated={tr('قبل شهر', 'a month ago')} sec={sec}>
      <PField label={tr('المنطقة', 'Area')} helper={M.govName('gaza')}>
        <PSelect value={sec.v.area} onValueChange={(a) => sec.set({ area: a })}>
          <PSelectTrigger className="md:max-w-xs"><PSelectValue /></PSelectTrigger>
          <PSelectContent>{areas.map((a) => <PSelectItem key={a.id} value={a.id}>{a.name}</PSelectItem>)}</PSelectContent>
        </PSelect>
      </PField>
      <Bi>
        <PField label={tr('العنوان بالعربية', 'Address in Arabic')}><PInput lang="ar" dir="rtl" value={sec.v.addrAr} onChange={(e) => sec.set({ addrAr: e.target.value })} /></PField>
        <PField label={tr('العنوان بالإنجليزية', 'Address in English')}><PInput lang="en" dir="ltr" value={sec.v.addrEn} onChange={(e) => sec.set({ addrEn: e.target.value })} /></PField>
      </Bi>
      <PField label={tr('علامة مميزة', 'Landmark')} labelEnd={<span className="text-caption text-muted-foreground">{tr('اختياري', 'Optional')}</span>}><PInput value={sec.v.landmark} onChange={(e) => sec.set({ landmark: e.target.value })} /></PField>
      <div className="flex flex-col gap-2">
        <span className="text-label">{tr('الموقع على الخريطة', 'Pin on the map')}</span>
        <SpaceMap spaces={[{ ...space, lat: sec.v.lat, lng: sec.v.lng }]} selectedId={space.id} onSelect={() => {}} picking onPick={(c) => sec.set(c)} label={tr('اضغط لتحريك الدبوس', 'Tap to move the pin')} className="h-64" />
        <p className="text-caption text-muted-foreground">{tr('اضغط على الخريطة لتحريك الدبوس إلى مدخل المساحة.', 'Tap the map to move the pin to the space’s entrance.')}</p>
      </div>
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
              <div className="flex items-center justify-between gap-3 md:w-44">
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

Object.assign(window, { useSection, ProfileSection, BasicsSection, LocationSection, HoursSection, dirtySet, Bi });
