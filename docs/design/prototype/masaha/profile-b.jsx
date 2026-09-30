const { Checkbox: QCheckbox, Field: QField, Input: QInput, Select: QSelect, SelectTrigger: QTrigger, SelectValue: QValue, SelectContent: QContent, SelectItem: QItem, Button: QButton, Badge: QBadge, XIcon: QX, ArrowUpIcon: QUp, ArrowDownIcon: QDown } = window.MasahaDesignSystem;

const PERIODS = () => [['hour', tr('ساعة', 'Hour')], ['day', tr('يوم', 'Day')], ['week', tr('أسبوع', 'Week')], ['month', tr('شهر', 'Month')]];
const AUDIENCE = () => [['all', tr('عام', 'Everyone')], ['students', tr('طلاب', 'Students')]];
const SHIFT_OPTS = () => [['none', tr('بدون وردية', 'No shift')], ['am', tr('الوردية الصباحية', 'Morning shift')], ['pm', tr('الوردية المسائية', 'Evening shift')]];

function MiniSelect({ label, value, onChange, options, className }) {
  return (
    <QField label={label}>
      <QSelect value={value} onValueChange={onChange}>
        <QTrigger className={className}><QValue /></QTrigger>
        <QContent>{options.map(([v, l]) => <QItem key={v} value={v}>{l}</QItem>)}</QContent>
      </QSelect>
    </QField>
  );
}

function PricesSection({ space, confirmable }) {
  const stale = pageParams.get('demo') !== 'fresh';
  const rows = [['hour', 'all', 'none', '', 3], ['day', 'all', 'none', '', 15], ['week', 'all', 'none', '', 90], ['month', 'all', 'none', '', 300], ['month', 'students', 'none', '', 250]].map(([period, audience, shift, label, amount], i) => ({ id: 'r' + i, period, audience, shift, label, amount: String(amount) }));
  const sec = useSection('prices', { rows });
  const setRow = (id, p) => sec.set({ rows: sec.v.rows.map((r) => (r.id === id ? { ...r, ...p } : r)) });
  const bad = (r) => r.amount !== '' && !(Number(r.amount) > 0);
  return (
    <ProfileSection id="prices" title={tr('الأسعار', 'Prices')} updated={stale ? tr('قبل 34 يومًا', '34 days ago') : tr('قبل 3 أيام', '3 days ago')} sec={sec}
      description={tr('للعرض فقط · الدفع في المساحة', 'Display only · Pay at the space')}
      validate={(v) => (v.rows.some(bad) ? tr('أدخل مبلغًا صحيحًا أكبر من صفر.', 'Enter a valid amount above zero.') : null)}
>
      {stale && !sec.updated && <p className="rounded-md bg-warning-subtle px-3 py-2 text-body-sm text-warning-subtle-foreground">{tr('مرّ أكثر من 30 يومًا على آخر تحديث، فيرى الزوار «قد تكون الأسعار تغيّرت». احفظ الأسعار أو أكّد أنها ما زالت صحيحة.', 'It’s been over 30 days, so visitors see «Prices may have changed». Save the prices, or confirm they’re still correct.')}</p>}
      <p className="text-caption text-muted-foreground">{tr('اترك المدة غير المتوفرة فارغة.', 'Leave periods you don’t offer empty.')}</p>
      <ul className="flex flex-col gap-3">
        {sec.v.rows.map((r) => (
          <li key={r.id} className="grid gap-2 rounded-lg border border-border p-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-2"><MiniSelect label={tr('المدة', 'Period')} value={r.period} onChange={(v) => setRow(r.id, { period: v })} options={PERIODS()} /></div>
            <div className="md:col-span-2"><MiniSelect label={tr('الفئة', 'Audience')} value={r.audience} onChange={(v) => setRow(r.id, { audience: v })} options={AUDIENCE()} /></div>
            <div className="md:col-span-3"><MiniSelect label={tr('الوردية', 'Shift')} value={r.shift} onChange={(v) => setRow(r.id, { shift: v })} options={SHIFT_OPTS()} /></div>
            <div className="md:col-span-2"><QField label={tr('وصف مخصّص', 'Custom label')} labelEnd={<span className="text-caption text-muted-foreground">{tr('اختياري', 'Optional')}</span>}><QInput value={r.label} onChange={(e) => setRow(r.id, { label: e.target.value })} /></QField></div>
            <div className="md:col-span-2"><QField label={tr('المبلغ (₪)', 'Amount (₪)')} error={bad(r) ? tr('مبلغ غير صحيح', 'Invalid amount') : undefined}><QInput inputMode="numeric" dir="ltr" value={r.amount} onChange={(e) => setRow(r.id, { amount: e.target.value.replace(/[^\d.]/g, '') })} /></QField></div>
            <div className="md:col-span-1 md:flex md:justify-end"><QButton type="button" variant="ghost" size="icon" aria-label={tr('حذف السعر', 'Remove price')} onClick={() => sec.set({ rows: sec.v.rows.filter((x) => x.id !== r.id) })}><QX /></QButton></div>
          </li>
        ))}
      </ul>
      <QButton type="button" variant="outline" className="self-start" onClick={() => sec.set({ rows: [...sec.v.rows, { id: 'n' + Date.now(), period: 'day', audience: 'all', shift: 'none', label: '', amount: '' }] })}>{tr('إضافة سعر', 'Add price')}</QButton>
    </ProfileSection>
  );
}

function AmenitiesSection({ space }) {
  const all = window.MASAHA.allAmenities;
  const sec = useSection('amenities', { list: space.amenities.slice() });
  const toggle = (id, on) => sec.set({ list: on ? [...sec.v.list, id] : sec.v.list.filter((x) => x !== id) });
  return (
    <ProfileSection id="amenities" title={tr('المرافق', 'Amenities')} updated={tr('قبل 20 يومًا', '20 days ago')} sec={sec}>
      <div className="grid gap-2 md:grid-cols-2">
        {all.map((a) => <QField key={a.id} label={a.name} orientation="horizontal"><QCheckbox checked={sec.v.list.includes(a.id)} onCheckedChange={(on) => toggle(a.id, !!on)} /></QField>)}
      </div>
    </ProfileSection>
  );
}

const CONTACT_TYPES = () => [['whatsapp', tr('واتساب', 'WhatsApp')], ['jawwal', tr('جوال', 'Jawwal')], ['ooredoo', tr('أوريدو', 'Ooredoo')], ['email', tr('بريد', 'Email')], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['website', tr('موقع', 'Website')]];
const LTR_TYPES = ['whatsapp', 'jawwal', 'ooredoo', 'email', 'instagram', 'facebook', 'tiktok', 'website'];
const placeholderFor = { whatsapp: '+970 59 000 0000', jawwal: '+970 59 000 0000', ooredoo: '+970 56 000 0000', email: 'name@example.com', instagram: 'username', facebook: 'page', tiktok: 'username', website: 'https://example.com' };

function ContactsSection({ space }) {
  const sec = useSection('contacts', { list: space.contacts.map((c, i) => ({ id: 'c' + i, ...c })) });
  const setC = (id, p) => sec.set({ list: sec.v.list.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  return (
    <ProfileSection id="contacts" title={tr('التواصل', 'Contacts')} updated={tr('قبل 75 يومًا', '75 days ago')} sec={sec}
      validate={(v) => (v.list.some((c) => !c.value.trim()) ? tr('املأ كل وسيلة تواصل أو احذفها.', 'Fill in each contact or remove it.') : null)}>
      <ul className="flex flex-col gap-3">
        {sec.v.list.map((c) => (
          <li key={c.id} className="grid gap-2 md:grid-cols-12 md:items-end">
            <div className="md:col-span-3"><MiniSelect label={tr('النوع', 'Type')} value={c.type} onChange={(v) => setC(c.id, { type: v })} options={CONTACT_TYPES()} /></div>
            <div className="md:col-span-8"><QField label={tr('القيمة', 'Value')}><QInput dir={LTR_TYPES.includes(c.type) ? 'ltr' : undefined} placeholder={placeholderFor[c.type]} value={c.value} onChange={(e) => setC(c.id, { value: e.target.value })} /></QField></div>
            <div className="md:col-span-1 md:flex md:justify-end"><QButton type="button" variant="ghost" size="icon" aria-label={tr('حذف', 'Remove')} onClick={() => sec.set({ list: sec.v.list.filter((x) => x.id !== c.id) })}><QX /></QButton></div>
          </li>
        ))}
      </ul>
      <QButton type="button" variant="outline" className="self-start" onClick={() => sec.set({ list: [...sec.v.list, { id: 'n' + Date.now(), type: 'whatsapp', value: '' }] })}>{tr('إضافة وسيلة تواصل', 'Add contact')}</QButton>
    </ProfileSection>
  );
}

function PhotosSection() {
  const sec = useSection('photos', { list: [1, 2, 3, 4, 5] });
  const move = (i, d) => { const l = sec.v.list.slice(); const j = i + d; [l[i], l[j]] = [l[j], l[i]]; sec.set({ list: l }); };
  const input = React.useRef(null);
  return (
    <ProfileSection id="photos" title={tr('الصور', 'Photos')} updated={tr('قبل شهرين', '2 months ago')} sec={sec}>
      <p className="text-caption text-muted-foreground">{tr('حتى 10 صور · JPG أو PNG · حتى 5 ميغابايت لكل صورة. الصورة الأولى هي الغلاف.', 'Up to 10 photos · JPG or PNG · up to 5 MB each. The first photo is the cover.')}</p>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {sec.v.list.map((n, i) => (
          <li key={n} className="flex flex-col gap-2 rounded-lg border border-border p-2">
            <div className="relative flex h-28 items-center justify-center rounded-md bg-muted text-caption text-muted-foreground" role="img" aria-label={tr('صورة ', 'Photo ') + n}>
              {tr('صورة', 'Photo')} {n}
              {i === 0 && <span className="photo-cover"><QBadge variant="primary">{tr('الغلاف', 'Cover')}</QBadge></span>}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <QButton type="button" variant="ghost" size="icon" disabled={i === 0} aria-label={tr('تحريك للأمام', 'Move earlier')} onClick={() => move(i, -1)}><QUp /></QButton>
              <QButton type="button" variant="ghost" size="icon" disabled={i === sec.v.list.length - 1} aria-label={tr('تحريك للخلف', 'Move later')} onClick={() => move(i, 1)}><QDown /></QButton>
              {i !== 0 && <QButton type="button" variant="ghost" size="sm" onClick={() => sec.set({ list: [n, ...sec.v.list.filter((x) => x !== n)] })}>{tr('غلاف', 'Cover')}</QButton>}
              <QButton type="button" variant="ghost" size="icon" className="ms-auto" aria-label={tr('حذف الصورة ', 'Delete photo ') + n} onClick={() => sec.set({ list: sec.v.list.filter((x) => x !== n) })}><QX /></QButton>
            </div>
          </li>
        ))}
      </ul>
      <input ref={input} type="file" accept="image/jpeg,image/png" multiple className="sr-only" onChange={(e) => { const add = Array.from(e.target.files || []).slice(0, 10 - sec.v.list.length).map((_, k) => Date.now() % 1000 + k); sec.set({ list: [...sec.v.list, ...add] }); }} />
      <QButton type="button" variant="outline" className="self-start" disabled={sec.v.list.length >= 10} onClick={() => input.current.click()}>{tr('رفع صور', 'Upload photos')}</QButton>
    </ProfileSection>
  );
}

function CapacitySection() {
  const sec = useSection('capacity', { capacity: '40', maxStay: '4' });
  return (
    <ProfileSection id="capacity" title={tr('السعة ومدة الجلوس', 'Capacity and stay')} updated={tr('قبل شهرين', '2 months ago')} sec={sec}
      validate={(v) => (!(Number(v.capacity) > 0) ? tr('أدخل السعة بعدد صحيح.', 'Enter the capacity as a whole number.') : null)}>
      <div className="grid gap-4 md:grid-cols-2">
        <QField label={tr('السعة', 'Capacity')} helper={tr('لا تظهر للزوار — يراها فريق المساحة فقط، وتُستخدم لحساب الحالة', 'Not shown to visitors — only the space team sees it; used to work out the state')}>
          <QInput inputMode="numeric" dir="ltr" value={sec.v.capacity} onChange={(e) => sec.set({ capacity: e.target.value.replace(/\D/g, '') })} />
        </QField>
        <QField label={tr('أقصى مدة جلوس (ساعات)', 'Maximum stay (hours)')} labelEnd={<span className="text-caption text-muted-foreground">{tr('اختياري', 'Optional')}</span>} helper={tr('يظهر في قواعد المساحة.', 'Shown in the space rules.')}>
          <QInput inputMode="numeric" dir="ltr" value={sec.v.maxStay} onChange={(e) => sec.set({ maxStay: e.target.value.replace(/\D/g, '') })} />
        </QField>
      </div>
    </ProfileSection>
  );
}

Object.assign(window, { PricesSection, AmenitiesSection, ContactsSection, PhotosSection, CapacitySection });
