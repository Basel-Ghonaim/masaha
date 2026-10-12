const { Checkbox: QCheckbox, Field: QField, Input: QInput, Select: QSelect, SelectTrigger: QTrigger, SelectValue: QValue, SelectContent: QContent, SelectItem: QItem, Button: QButton, Badge: QBadge, Table: QTable, TableHeader: QTHead, TableBody: QTBody, TableRow: QTr, TableHead: QTh, TableCell: QTd, XIcon: QX, ArrowUpIcon: QUp, ArrowDownIcon: QDown } = window.MasahaDesignSystem;

const PERIODS = () => [['hour', tr('ساعة', 'Hour')], ['day', tr('يوم', 'Day')], ['week', tr('أسبوع', 'Week')], ['month', tr('شهر', 'Month')]];
const AUDIENCE = () => [['all', tr('عام', 'Everyone')], ['students', tr('طلاب', 'Students')]];

// A field named for the ear only: in the prices' table the column's header is its visible label.
const srLabel = (text) => <span className="sr-only">{text}</span>;
function MiniSelect({ label, value, onChange, options, className, error, disabled }) {
  return (
    <QField label={label} error={error}>
      <QSelect value={value} onValueChange={onChange} disabled={disabled}>
        <QTrigger className={className}><QValue /></QTrigger>
        <QContent>{options.map(([v, l]) => <QItem key={v} value={v}>{l}</QItem>)}</QContent>
      </QSelect>
    </QField>
  );
}

const PRICE_LIMIT = 40;
const sampleRows = () => (pageParams.get('demo') === 'pricelimit'
  ? Array.from({ length: PRICE_LIMIT }, (_, i) => ({ period: PERIODS()[i % 4][0], audience: i % 8 < 4 ? 'all' : 'students', shift: 'none', labelAr: 'خيار ' + (Math.floor(i / 8) + 1), labelEn: '', amount: String(5 + i) }))
  : [['hour', 'all', 3], ['day', 'all', 15], ['week', 'all', 90], ['month', 'all', 300], ['month', 'students', 250]].map(([period, audience, amount]) => ({ period, audience, shift: 'none', labelAr: '', labelEn: '', amount: String(amount) }))
).map((r, i) => ({ id: 'r' + i, ...r }));

// AD-008: one price per period, audience, shift and label; a repeat is marked on the field that
// would tell it apart — the label when it has one, else the shift, else the period.
function priceErrors(v) {
  const out = {};
  const seen = new Set();
  v.rows.forEach((r) => {
    if (r.amount === '') out[r.id + '-amount'] = tr('أدخل مبلغًا', 'Enter an amount');
    else if (!(Number(r.amount) > 0)) out[r.id + '-amount'] = tr('مبلغ غير صحيح', 'Invalid amount');
    if (r.labelEn.trim() && !r.labelAr.trim()) out[r.id + '-labelAr'] = tr('الوصف بالعربية أولًا', 'The Arabic label first');
    const key = [r.period, r.audience, r.shift, r.labelAr.trim()].join('|');
    if (seen.has(key)) out[r.id + '-' + (r.labelAr.trim() ? 'labelAr' : r.shift !== 'none' ? 'shift' : 'period')] = tr('سعر مكرّر: غيّر هذا الحقل', 'A repeated price: change this field');
    seen.add(key);
  });
  return errorsOf(out);
}

function PricesSection({ space, meta = {} }) {
  const shifts = useStored('shifts');
  const wide = useIsTablet();
  const sec = useSection('prices', { rows: meta.missing ? [] : sampleRows() }, meta.missing);
  React.useEffect(() => { publish('usedShifts', sec.v.rows.map((r) => r.shift).filter((x) => x !== 'none')); }, []);
  const setRow = (id, p) => sec.set({ rows: sec.v.rows.map((r) => (r.id === id ? { ...r, ...p } : r)) });
  const save = () => { sec.save(); publish('usedShifts', sec.v.rows.map((r) => r.shift).filter((x) => x !== 'none')); };
  const shiftOpts = [['none', tr('بدون وردية', 'No shift')], ...shifts.map((x) => [x.id, tr(x.ar, x.en || x.ar)])];
  const noShifts = shifts.length === 0;
  const full = sec.v.rows.length >= PRICE_LIMIT;
  const add = () => sec.set({ rows: [...sec.v.rows, { id: 'n' + Date.now(), period: 'day', audience: 'all', shift: 'none', labelAr: '', labelEn: '', amount: '' }] });
  const remove = (id) => sec.set({ rows: sec.v.rows.filter((x) => x.id !== id) });
  const col = { period: tr('المدة', 'Period'), audience: tr('الفئة', 'Audience'), shift: tr('الوردية', 'Shift'), labelAr: tr('وصف مخصّص', 'Custom label'), labelEn: tr('الوصف بالإنجليزية', 'Label in English'), amount: tr('المبلغ (₪)', 'Amount (₪)') };
  const cells = (r, i, errors, named) => {
    const L = (k) => (named ? col[k] : srLabel(col[k] + ' — ' + tr('السعر ', 'price ') + (i + 1)));
    return {
      period: <MiniSelect label={L('period')} value={r.period} onChange={(v) => setRow(r.id, { period: v })} options={PERIODS()} error={errors[r.id + '-period']} />,
      audience: <MiniSelect label={L('audience')} value={r.audience} onChange={(v) => setRow(r.id, { audience: v })} options={AUDIENCE()} />,
      shift: <MiniSelect label={L('shift')} value={r.shift} onChange={(v) => setRow(r.id, { shift: v })} options={shiftOpts} disabled={noShifts} error={errors[r.id + '-shift']} />,
      labelAr: <QField label={L('labelAr')} labelEnd={named ? <Optional /> : undefined} error={errors[r.id + '-labelAr']}><QInput lang="ar" dir="rtl" value={r.labelAr} onChange={(e) => setRow(r.id, { labelAr: e.target.value })} /></QField>,
      // DI-12: the label is a pair of languages, the English only with the Arabic.
      labelEn: (r.labelAr.trim() || r.labelEn) ? <QField label={named ? col.labelEn : srLabel(col.labelEn + ' — ' + tr('السعر ', 'price ') + (i + 1))} labelEnd={named ? <Optional /> : undefined}><QInput lang="en" dir="ltr" placeholder={named ? undefined : tr('بالإنجليزية (اختياري)', 'In English (optional)')} value={r.labelEn} onChange={(e) => setRow(r.id, { labelEn: e.target.value })} /></QField> : null,
      amount: <QField label={L('amount')} error={errors[r.id + '-amount']}><QInput inputMode="decimal" dir="ltr" value={r.amount} onChange={(e) => setRow(r.id, { amount: latinDigits(e.target.value).replace(/[^\d.]/g, '') })} /></QField>,
      remove: <QButton type="button" variant="ghost" size="icon" aria-label={tr('حذف السعر ', 'Remove price ') + (i + 1)} onClick={() => remove(r.id)}><QX /></QButton>
    };
  };
  return (
    <ProfileSection id="prices" title={tr('الأسعار', 'Prices')} updated={meta.updated || tr('قبل 3 أيام', '3 days ago')} stale={meta.stale} sec={{ ...sec, save }}
      description={tr('للعرض فقط · الدفع في المساحة', 'Display only · Pay at the space')} validate={priceErrors}>
      {(errors) => <>
        <p className="text-caption text-muted-foreground">{tr('اترك المدة غير المتوفرة بلا سعر.', 'Leave out the periods you don’t offer.')}</p>
        {noShifts && <p className="text-caption text-muted-foreground">{tr('لا ورديات محفوظة بعد، فكل الأسعار بلا وردية. ', 'No shifts are saved yet, so every price has none. ')}<a href="#hours">{tr('أضف ورديات في ساعات العمل أولًا', 'Add shifts in the opening hours first')}</a></p>}
        {sec.v.rows.length > 0 && (wide ? (
          <div className="price-table rounded-lg border border-border">
            <QTable>
              <colgroup><col className="w-period" /><col className="w-audience" /><col className="w-shift" /><col className="w-label" /><col className="w-amount" /><col className="w-remove" /></colgroup>
              <QTHead><QTr>{['period', 'audience', 'shift', 'labelAr', 'amount'].map((k) => <QTh key={k}>{col[k]}{k === 'labelAr' && <span className="block text-muted-foreground">{tr('اختياري', 'optional')}</span>}</QTh>)}<QTh><span className="sr-only">{tr('حذف', 'Remove')}</span></QTh></QTr></QTHead>
              <QTBody>
                {sec.v.rows.map((r, i) => {
                  const c = cells(r, i, errors, false);
                  return (
                    <QTr key={r.id} className="price-row">
                      <QTd>{c.period}</QTd><QTd>{c.audience}</QTd><QTd>{c.shift}</QTd>
                      <QTd><div className="flex flex-col gap-2">{c.labelAr}{c.labelEn}</div></QTd>
                      <QTd>{c.amount}</QTd><QTd>{c.remove}</QTd>
                    </QTr>
                  );
                })}
              </QTBody>
            </QTable>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {sec.v.rows.map((r, i) => {
              const c = cells(r, i, errors, true);
              return (
                <li key={r.id} className="flex flex-col gap-3 rounded-lg border border-border p-3">
                  <div className="grid grid-cols-2 gap-3">{c.period}{c.audience}</div>
                  {c.shift}{c.labelAr}{c.labelEn}
                  <div className="flex items-end gap-2"><div className="min-w-0 flex-1">{c.amount}</div>{c.remove}</div>
                </li>
              );
            })}
          </ul>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <QButton type="button" variant="outline" disabled={full} onClick={add}>{tr('إضافة سعر', 'Add price')}</QButton>
          {full && <LimitNote>{tr('الحد 40 سعرًا', 'Up to 40 prices')}</LimitNote>}
        </div>
      </>}
    </ProfileSection>
  );
}

function AmenitiesSection({ space, meta = {}, manage }) {
  const all = window.MASAHA.allAmenities;
  const sec = useSection('amenities', { list: meta.missing ? [] : space.amenities.slice() }, meta.missing);
  const toggle = (id, on) => sec.set({ list: on ? [...sec.v.list, id] : sec.v.list.filter((x) => x !== id) });
  return (
    <ProfileSection id="amenities" title={tr('المرافق', 'Amenities')} updated={meta.updated || tr('قبل 20 يومًا', '20 days ago')} stale={meta.stale} sec={sec}>
      <div className="grid gap-2 md:grid-cols-2">
        {all.map((a) => <QField key={a.id} label={a.name} orientation="horizontal"><QCheckbox checked={sec.v.list.includes(a.id)} onCheckedChange={(on) => toggle(a.id, !!on)} /></QField>)}
      </div>
      {manage && <p className="text-body-sm text-muted-foreground">{tr('مرفق ليس في القائمة؟ ', 'An amenity not on the list? ')}<a href={manage}>{tr('إدارة قائمة المرافق', 'Manage the amenities list')}</a></p>}
    </ProfileSection>
  );
}

// AD-006: the contract's seven types. A carrier is no kind of contact: a phone's carrier is read
// from its number. Every value is stored in one form, which its helper shows as it is typed.
const CONTACT_TYPES = () => [['whatsapp', tr('واتساب', 'WhatsApp')], ['phone', tr('هاتف', 'Phone')], ['email', tr('بريد', 'Email')], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['website', tr('موقع', 'Website')]];
const OLD_TYPE = { jawwal: 'phone', ooredoo: 'phone' };
const CONTACT_LIMIT = 20;
const exampleFor = { whatsapp: '0599 123 456', phone: '0599 123 456', email: 'name@example.com', instagram: '@name', facebook: 'facebook.com/name', tiktok: '@name', website: 'example.com' };
const NETWORK = { instagram: ['instagram.com', (h) => 'https://instagram.com/' + h], facebook: ['facebook.com', (h) => 'https://facebook.com/' + h], tiktok: ['tiktok.com', (h) => 'https://www.tiktok.com/@' + h] };

// The data model's forms, approximated for the helper: the web uses the shared rules.
function storedForm(type, raw) {
  const t = latinDigits((raw || '').trim());
  if (!t) return null;
  if (type === 'whatsapp' || type === 'phone') {
    let d = t.replace(/\(0\)/g, '').replace(/[\s\-.()]/g, '');
    if (d.startsWith('00')) d = '+' + d.slice(2);
    if (/^\+97[02]5[69]\d{7}$/.test(d)) d = '+970' + d.slice(4);
    else if (/^05[69]\d{7}$/.test(d)) d = '+970' + d.slice(1);
    else if (/^05\d{8}$/.test(d)) d = '+972' + d.slice(1);
    else if (/^0\d{8}$/.test(d)) d = '+970' + d.slice(1);
    return /^\+97[02]\d{8,9}$/.test(d) ? d : '';
  }
  if (type === 'email') return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t) ? t.toLowerCase() : '';
  if (type === 'website') { const u = /^https?:\/\//i.test(t) ? t : 'https://' + t; return /^https?:\/\/[^\s/]+\.[^\s/]+/i.test(u) ? u.replace(/^https?:\/\/([^/]+)/i, (m, h) => 'https://' + h.toLowerCase()) : ''; }
  const [host, from] = NETWORK[type];
  if (/\//.test(t) || /\.(com|net|org|php)$/i.test(t)) {
    const m = t.replace(/^https?:\/\//i, '').match(/^(?:www\.|m\.)?([^/]+)\/([^?#]+)/i);
    return m && m[1].toLowerCase() === host ? 'https://' + (type === 'tiktok' ? 'www.' : '') + host + '/' + m[2] : '';
  }
  const h = t.replace(/^@/, '');
  return /^[\w.]+$/.test(h) ? from(h) : '';
}
const carrierOf = (stored) => (/^\+97059/.test(stored) ? tr('جوال', 'Jawwal') : /^\+97056/.test(stored) ? tr('أوريدو', 'Ooredoo') : null);

function contactErrors(v) {
  const out = {};
  const seen = new Set();
  v.list.forEach((c) => {
    const s = storedForm(c.type, c.value);
    if (s === null) out[c.id] = tr('املأ القيمة أو احذف هذه الوسيلة', 'Fill in the value, or remove this contact');
    else if (s === '') out[c.id] = c.type === 'whatsapp' || c.type === 'phone' ? tr('رقم غير صالح: رقم فلسطيني أو إسرائيلي', 'Not a valid number: a Palestinian or Israeli one') : c.type === 'email' ? tr('بريد غير صالح', 'Not a valid email') : tr('رابط أو اسم غير صالح لهذا النوع', 'Not a valid link or name for this type');
    else if (seen.has(c.type + s)) out[c.id] = tr('وسيلة مكرّرة', 'A repeated contact');
    if (s) seen.add(c.type + s);
  });
  return errorsOf(out);
}

function ContactsSection({ space, meta = {} }) {
  const sec = useSection('contacts', { list: meta.missing ? [] : space.contacts.map((c, i) => ({ id: 'c' + i, type: OLD_TYPE[c.type] || c.type, value: c.value })) }, meta.missing);
  const setC = (id, p) => sec.set({ list: sec.v.list.map((c) => (c.id === id ? { ...c, ...p } : c)) });
  const full = sec.v.list.length >= CONTACT_LIMIT;
  return (
    <ProfileSection id="contacts" title={tr('التواصل', 'Contacts')} updated={meta.updated || tr('قبل 75 يومًا', '75 days ago')} stale={meta.stale} sec={sec} validate={contactErrors}>
      {(errors) => <>
        {sec.v.list.length > 0 && <ul className="flex flex-col gap-4">
          {sec.v.list.map((c, i) => {
            const stored = storedForm(c.type, c.value);
            const carrier = c.type === 'phone' && stored ? carrierOf(stored) : null;
            return (
              <li key={c.id} className="grid gap-2 md:grid-cols-12 md:items-start">
                <div className="md:col-span-3"><MiniSelect label={tr('النوع', 'Type')} value={c.type} onChange={(v) => setC(c.id, { type: v })} options={CONTACT_TYPES()} /></div>
                <div className="md:col-span-8">
                  <QField label={tr('القيمة', 'Value')} labelEnd={carrier ? <QBadge variant="neutral">{carrier}</QBadge> : undefined} error={errors[c.id]}
                    helper={stored ? <>{tr('يُحفظ كـ ', 'Stored as ')}<Ltr>{stored}</Ltr></> : <>{tr('مثال: ', 'For example: ')}<Ltr>{exampleFor[c.type]}</Ltr></>}>
                    <QInput dir="ltr" value={c.value} onChange={(e) => setC(c.id, { value: e.target.value })} />
                  </QField>
                </div>
                <div className="contact-remove md:col-span-1 md:flex md:justify-end"><QButton type="button" variant="ghost" size="icon" aria-label={tr('حذف وسيلة التواصل ', 'Remove contact ') + (i + 1)} onClick={() => sec.set({ list: sec.v.list.filter((x) => x.id !== c.id) })}><QX /></QButton></div>
              </li>
            );
          })}
        </ul>}
        <div className="flex flex-wrap items-center gap-3">
          <QButton type="button" variant="outline" disabled={full} onClick={() => sec.set({ list: [...sec.v.list, { id: 'n' + Date.now(), type: 'whatsapp', value: '' }] })}>{tr('إضافة وسيلة تواصل', 'Add contact')}</QButton>
          {full && <LimitNote>{tr('الحد 20 وسيلة', 'Up to 20 contacts')}</LimitNote>}
        </div>
      </>}
    </ProfileSection>
  );
}

// E6 (A1, O7): the photos are no fact group, so they have no date, no confirm and no save. Each
// act is immediate: a chosen file uploads at once on its own tile, with its progress, and a failure
// stays on that tile; removal asks first; reorder and cover apply at once and are announced.
const PHOTO_LIMIT = 10;
const MAX_BYTES = 5 * 1024 * 1024;
function PhotosSection({ empty }) {
  const { Card, CardHeader, CardDescription, CardContent, AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, toast } = window.MasahaDesignSystem;
  const [tiles, setTiles] = React.useState(empty ? [] : [1, 2, 3, 4, 5].map((n) => ({ id: 'p' + n, n, state: 'done' })));
  const [leftOut, setLeftOut] = React.useState(0);
  const [said, say] = React.useState('');
  const [removing, setRemoving] = React.useState(null);
  const input = React.useRef(null);
  const failNext = React.useRef(actionFails('upload'));
  const next = React.useRef(empty ? 1 : 6);
  const counted = tiles.filter((t) => t.state === 'done' || t.state === 'uploading').length;
  const coverId = (tiles.find((t) => t.state === 'done') || {}).id;
  const patch = (id, p) => setTiles((l) => l.map((t) => (t.id === id ? { ...t, ...p } : t)));
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
  // A refused file takes no place: only the photos that can go up fill the room left.
  const choose = (files) => {
    let room = PHOTO_LIMIT - counted, out = 0;
    const added = [];
    Array.from(files).forEach((f) => {
      const why = !/^image\/(jpeg|png)$/.test(f.type) ? tr('JPG أو PNG فقط', 'JPG or PNG only') : f.size > MAX_BYTES ? tr('أكبر من 5 ميغابايت', 'Larger than 5 MB') : null;
      if (!why && room <= 0) { out++; return; }
      if (!why) room--;
      const n = next.current++;
      added.push({ id: 'p' + n, n, url: why ? null : URL.createObjectURL(f), state: why ? 'rejected' : 'uploading', why, progress: 0 });
    });
    setLeftOut(out);
    setTiles((l) => [...l, ...added]);
    added.filter((t) => t.state === 'uploading').forEach((t) => upload(t.id));
  };
  const name = (t) => tr('صورة ', 'Photo ') + t.n;
  const move = (i, d) => {
    const l = tiles.slice(); const j = i + d; [l[i], l[j]] = [l[j], l[i]]; setTiles(l);
    say(tr(`${name(l[j])} الآن في الموضع ${j + 1} من ${l.length}`, `${name(l[j])} is now at position ${j + 1} of ${l.length}`));
  };
  const cover = (i) => { const t = tiles[i]; setTiles([t, ...tiles.filter((x) => x.id !== t.id)]); say(tr(`${name(t)} هي الغلاف الآن`, `${name(t)} is the cover now`)); };
  const drop = (id) => setTiles((l) => l.filter((x) => x.id !== id));
  const full = counted >= PHOTO_LIMIT;
  return (
    <Card id="photos" className="section-anchor">
      <CardHeader>
        <SectionTitle>{tr('الصور', 'Photos')}</SectionTitle>
        <CardDescription>{tr('حتى 10 صور · JPG أو PNG · حتى 5 ميغابايت لكل صورة. الأولى هي الغلاف. كل تغيير يُحفظ فورًا.', 'Up to 10 photos · JPG or PNG · up to 5 MB each. The first is the cover. Every change is saved at once.')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="sr-only" aria-live="polite">{said}</p>
        {tiles.length === 0 ? <p className="text-body-sm text-muted-foreground">{tr('لا صور بعد.', 'No photos yet.')}</p> : (
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {tiles.map((t, i) => (
              <li key={t.id} className="flex flex-col gap-2 rounded-lg border border-border p-2">
                <div className="photo-thumb relative flex items-center justify-center overflow-hidden rounded-md bg-muted text-caption text-muted-foreground" role="img" aria-label={name(t)}>
                  {t.url ? <img src={t.url} alt="" className="size-full object-cover" /> : name(t)}
                  {t.id === coverId && <span className="photo-cover"><QBadge variant="primary">{tr('الغلاف', 'Cover')}</QBadge></span>}
                </div>
                {t.state === 'uploading' && <div className="flex flex-col gap-1">
                  <div className="upload-bar" role="progressbar" aria-label={tr('رفع ', 'Uploading ') + name(t)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={t.progress}><span style={{ width: t.progress + '%' }} /></div>
                  <span className="text-caption text-muted-foreground">{tr('جارٍ الرفع…', 'Uploading…')} <Ltr>{t.progress}%</Ltr></span>
                </div>}
                {t.state === 'failed' && <div className="flex flex-col gap-1">
                  <p className="text-caption text-destructive">{tr('لم تُرفع: انقطع الاتصال.', 'Not uploaded: the connection dropped.')}</p>
                  <div className="flex flex-wrap gap-1"><QButton type="button" variant="outline" size="sm" disabled={full} onClick={() => upload(t.id)}>{tr('إعادة المحاولة', 'Try again')}</QButton><QButton type="button" variant="ghost" size="sm" onClick={() => drop(t.id)}>{tr('إزالة', 'Remove')}</QButton></div>
                </div>}
                {t.state === 'rejected' && <div className="flex flex-col gap-1">
                  <p className="text-caption text-destructive">{tr('لم تُرفع: ', 'Not uploaded: ')}{t.why}</p>
                  <div><QButton type="button" variant="ghost" size="sm" onClick={() => drop(t.id)}>{tr('إزالة', 'Remove')}</QButton></div>
                </div>}
                {t.state === 'done' && <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <QButton type="button" variant="ghost" size="icon" disabled={i === 0} aria-label={tr('تحريك ', 'Move ') + name(t) + tr(' للأمام', ' earlier')} onClick={() => move(i, -1)}><QUp /></QButton>
                    <QButton type="button" variant="ghost" size="icon" disabled={i === tiles.length - 1} aria-label={tr('تحريك ', 'Move ') + name(t) + tr(' للخلف', ' later')} onClick={() => move(i, 1)}><QDown /></QButton>
                    <QButton type="button" variant="ghost" size="icon" className="ms-auto" aria-label={tr('حذف ', 'Delete ') + name(t)} onClick={() => setRemoving(t)}><QX /></QButton>
                  </div>
                  {t.id !== coverId && <QButton type="button" variant="ghost" size="sm" className="self-start" onClick={() => cover(i)}>{tr('اجعلها الغلاف', 'Make cover')}</QButton>}
                </div>}
              </li>
            ))}
          </ul>
        )}
        <input ref={input} type="file" accept="image/jpeg,image/png" multiple className="sr-only" tabIndex={-1} onChange={(e) => { choose(e.target.files || []); e.target.value = ''; }} />
        {leftOut > 0 && <p className="text-caption text-destructive">{tr(`لم تُضف ${leftOut === 1 ? 'صورة واحدة' : leftOut === 2 ? 'صورتان' : leftOut + ' صور'}: الحد 10 صور.`, `${leftOut} left out: the limit is 10 photos.`)}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <QButton type="button" variant="outline" disabled={full} onClick={() => input.current.click()}>{tr('رفع صور', 'Upload photos')}</QButton>
          {full && <LimitNote>{tr('الحد 10 صور — احذف صورة لتضيف غيرها', 'Up to 10 photos — delete one to add another')}</LimitNote>}
        </div>
      </CardContent>
      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tr('حذف ', 'Delete ')}{removing && name(removing)}{tr('؟', '?')}</AlertDialogTitle>
            <AlertDialogDescription>{tr('تختفي من صفحة المساحة فورًا، ولا يمكن استرجاعها.', 'It leaves the space’s page at once, and cannot be brought back.')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr('رجوع', 'Back')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => { drop(removing.id); toast.success(tr('حُذفت ', 'Deleted ') + name(removing)); }}>{tr('حذف', 'Delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
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

Object.assign(window, { CONTACT_TYPES, OLD_TYPE, storedForm, carrierOf, PricesSection, AmenitiesSection, ContactsSection, PhotosSection, CapacitySection });
