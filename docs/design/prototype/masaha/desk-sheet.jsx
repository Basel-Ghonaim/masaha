// 4.5 New customer / new subscription / renewal — one step (DK-006): the customer, the package, the
// dates and the money block (K2). A renewal with a debt takes the old balance first (K3).
const DS5 = window.MasahaDesignSystem;
const D5 = window.DESK;

// DK-007: a package is one line — its name and price, its terms as a caption.
function PkgOption({ value, title, amount, terms, tag }) {
  return (
    <DS5.Field orientation="horizontal" className="px-3 py-2" label={
      <span className="flex min-w-0 flex-col">
        <span className="flex flex-wrap items-center gap-2 text-label">{title}{amount != null && <span>· <Money n={amount} /></span>}{tag}</span>
        <span className="text-caption text-muted-foreground">{terms}</span>
      </span>
    }><DS5.RadioGroupItem value={value} /></DS5.Field>
  );
}
const Opt = () => <span className="text-caption text-muted-foreground">{tr('اختياري', 'Optional')}</span>;
const NumIn = ({ label, value, onChange, error }) => <DS5.Field label={label} labelEnd={<Opt />} error={error}><DS5.Input inputMode="numeric" dir="ltr" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))} /></DS5.Field>;
// DK-008's counted words, after «استهلاك».
const F_HOURS_GEN = { ar: { one: 'ساعة واحدة', two: 'ساعتين', few: '{n} ساعات', many: '{n} ساعة', other: '{n} ساعة' }, en: ['{n} hour', '{n} hours'] };
const F_DAYS_GEN = { ar: { one: 'يوم واحد', two: 'يومين', few: '{n} أيام', many: '{n} يومًا', other: '{n} يوم' }, en: ['{n} day', '{n} days'] };

function SubscriptionSheet({ dlg, onClose }) {
  const desk = useDesk();
  const c = dlg && dlg.customerId ? D5.findCustomer(dlg.customerId) : null;
  const cur = c && D5.currentSub(c);
  const renew = !!dlg && dlg.mode === 'renew';
  const [name, setName] = React.useState(''); const [phone, setPhone] = React.useState('');
  const [pk, setPk] = React.useState('month'); const [start, setStart] = React.useState(D5.TODAY);
  const [showPk, setShowPk] = React.useState(true);
  const [priceEdit, setPriceEdit] = React.useState(false); const [price, setPrice] = React.useState('');
  const [cu, setCu] = React.useState({});
  // null: «المستلم الآن» follows what is due; typing takes it over.
  const [received, setReceived] = React.useState(null); const [method, setMethod] = React.useState('cash');
  const [err, setErr] = React.useState({});
  // DK-018: the subscription saved and its payment not — the sheet stays, to retry the payment alone.
  const [half, setHalf] = React.useState(null);
  const saveRef = React.useRef(null);
  const { busy, run } = useActionRun('sheet');
  const payRun = useActionRun('sheet-pay');
  React.useEffect(() => {
    if (!dlg) return;
    setName(c ? c.name : dlg.name || ''); setPhone(c ? c.phone || '' : dlg.phone || '');
    const startPk = renew && cur ? cur.pkg : dlg.pkg || 'month';
    setPk(startPk); setShowPk(!(renew && cur && cur.pkg !== 'custom'));
    setStart(renew && cur && cur.to && D5.subStatus(cur) !== 'expired' ? D5.addDays(cur.to, 1) : D5.TODAY);
    setPriceEdit(false); setPrice(''); setMethod('cash'); setErr({}); setHalf(null);
    setReceived(dlg.payNow ? String(dlg.payNow) : null);
    setCu(dlg.custom || { to: '', totalDays: '', daysPerWeek: '', hoursPerDay: '', hourBalance: '', billing: 'fixed', amount: '', unit: 'hour', rate: String(D5.PRICES.hour), shift: '', title: '', note: '' });
  }, [dlg]);
  // ?half=1: the frame of a payment that failed after the save (with ?fail=sheet-pay).
  React.useEffect(() => { if (!dlg || !dlg.half) return undefined; const t = setTimeout(() => saveRef.current && saveRef.current(true), 50); return () => clearTimeout(t); }, [dlg]);
  if (!dlg) return <DS5.Sheet open={false}><DS5.SheetContent closeLabel="" /></DS5.Sheet>;

  const P = D5.pkg(pk); const custom = pk === 'custom';
  const setC = (x) => setCu((y) => ({ ...y, ...x }));
  const publishedRate = cu.unit === 'hour' ? D5.PRICES.hour : D5.PRICES.day;
  const manual = custom ? (cu.billing === 'fixed' ? cu.amount !== '' : Number(cu.rate) !== publishedRate) : priceEdit && price !== '' && Number(price) !== P.amount;
  const usage = custom && cu.billing === 'usage';
  const newDue = usage ? 0 : custom ? Number(cu.amount) || 0 : priceEdit && price !== '' ? Number(price) : P.amount;
  // DK-008: a custom subscription keeps no end it was not given.
  const end = custom ? cu.to || null : D5.addDays(start, P.days - 1);
  // K3: a renewal takes what is owed from before first — every open item, oldest first.
  const prior = renew && c ? D5.openItems(c) : [];
  const priorTotal = prior.reduce((a, i) => a + i.due - i.paid, 0);
  const due = priorTotal + newDue;
  const value = received == null ? String(due) : received;
  const m = moneyOf(due, value, usage);
  const askName = !c; const askPhone = !c || !c.phone;
  const unpaidAfter = usage || m.left > 0;
  const itemLabel = (i) => { if (i.kind === 'visit') return tr('زيارة ', 'Visit ') + D5.fmtDate(i.date); const s = c.subs.find((x) => x.id === i.id); return s.debtLabel || s.name; };
  const subName = custom ? cu.title.trim() || tr('مخصّص', 'Custom') : P.name;

  const saveNow = (failPay) => {
    const n = (v) => (v === '' || v == null ? undefined : Number(v));
    const sub = custom
      ? { id: 's' + Date.now(), pkg: 'custom', name: subName, from: start, to: end, terms: { totalDays: n(cu.totalDays), daysPerWeek: n(cu.daysPerWeek), hoursPerDay: n(cu.hoursPerDay), hourBalance: n(cu.hourBalance) }, used: {}, billing: usage ? { type: 'usage', unit: cu.unit, rate: Number(cu.rate) } : { type: 'fixed', amount: newDue }, manual, shift: cu.shift || null, note: cu.note, pays: [] }
      : { id: 's' + Date.now(), pkg: pk, name: P.name, from: start, to: end, terms: { totalDays: P.totalDays, daysPerWeek: P.daysPerWeek, hourBalance: P.hourBalance }, used: {}, billing: { type: 'fixed', amount: newDue }, manual, pays: [] };
    const saved = desk.saveSubscription({ customerId: c && c.id, name: name.trim(), phone }, sub, failPay ? null : { recorded: m.recorded, method, renew });
    if (failPay) setHalf({ customerId: saved.id, amount: m.recorded });
  };
  saveRef.current = saveNow;
  const submit = (e) => {
    e.preventDefault();
    const x = {};
    if (askName && !name.trim()) x.name = tr('أدخل الاسم', 'Enter the name');
    if (askPhone && phone && !phoneOk(phone)) x.phone = tr('رقم غير مكتمل، مثل +970 59 000 0000', 'Incomplete number, e.g. +970 59 000 0000');
    else if (askPhone && unpaidAfter && !phoneOk(phone)) x.phone = usage
      ? tr('رقم الجوال مطلوب لاشتراك يُحسب من الحضور، مثل +970 59 000 0000', 'A mobile number is required for a subscription billed from attendance, e.g. +970 59 000 0000')
      : tr(`رقم الجوال مطلوب: يبقى ${D5.money(m.left)} دينًا، مثل +970 59 000 0000`, `A mobile number is required: ${D5.money(m.left)} stays owed, e.g. +970 59 000 0000`);
    if (custom && cu.billing === 'fixed' && !(Number(cu.amount) > 0)) x.amount = tr('أدخل السعر', 'Enter the price');
    if (custom && cu.to && cu.to < start) x.to = tr('تاريخ النهاية قبل البداية', 'The end is before the start');
    setErr(x); if (Object.keys(x).length) return focusInvalid();
    run(() => saveNow(actionFails('sheet-pay') && m.recorded > 0));
  };

  const hb = Number(cu.hourBalance) || 0; const td = Number(cu.totalDays) || 0;
  const endNote = !custom || cu.to ? null : hb || td ? (
    <p className="text-caption text-muted-foreground">
      {tr('بلا تاريخ نهاية · ينتهي عند استهلاك ', 'No end date · ends when ')}
      {hb ? <Counted n={hb} ar={F_HOURS_GEN.ar} en={F_HOURS_GEN.en} /> : null}{hb && td ? tr(' أو ', ' or ') : null}{td ? <Counted n={td} ar={F_DAYS_GEN.ar} en={F_DAYS_GEN.en} /> : null}
      {tr('', ' are used')}{hb && td ? tr('، أيهما أسبق', ', whichever comes first') : null}
    </p>
  ) : (
    <p className="flex items-center gap-2 text-caption text-muted-foreground"><DS5.TriangleAlertIcon className="size-4 text-warning" aria-hidden="true" />{tr('بلا حدّ · يبقى نشطًا حتى يُنهى', 'No limit · stays active until it is ended')}</p>
  );
  const calc = prior.length ? <>
    {prior.map((i) => <span key={i.id}>{itemLabel(i)} <Money n={i.due - i.paid} /></span>)}
    <span>{tr('التجديد: ', 'The renewal: ')}{subName} {usage ? tr('— يُحسب من الحضور', '— billed from attendance') : <Money n={newDue} />}</span>
  </> : usage ? <span>{tr('يُحسب من الحضور:', 'Billed from attendance:')} <Money n={Number(cu.rate) || 0} /> {cu.unit === 'hour' ? tr('للساعة', 'per hour') : tr('لليوم', 'per day')}</span> : null;
  const submitLabel = m.recorded > 0
    ? <>{renew ? tr('تجديد واستلام', 'Renew and take') : tr('حفظ واستلام', 'Save and take')} <Money n={m.recorded} /></>
    : renew ? tr('تجديد بدون دفع', 'Renew without payment') : tr('حفظ بدون دفع', 'Save without payment');
  const title = renew ? tr('تجديد الاشتراك', 'Renew subscription') : c ? tr('اشتراك جديد', 'New subscription') : tr('زبون جديد', 'New customer');

  return (
    <DS5.Sheet open onOpenChange={(o) => !o && onClose()}>
      <DS5.SheetContent side="end" closeLabel={tr('إغلاق', 'Close')}>
        <DS5.SheetHeader>
          <DS5.SheetTitle>{title}</DS5.SheetTitle>
          <DS5.SheetDescription>{c ? c.name : tr('الاسم والجوال، ثم الاشتراك والدفع.', 'The name and mobile, then the subscription and the payment.')}</DS5.SheetDescription>
        </DS5.SheetHeader>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DS5.SheetBody className="flex flex-col gap-5 py-2">
            {half ? <>
              <DS5.Alert variant="destructive">
                <DS5.AlertTitle>{tr('حُفظ الاشتراك؛ لم تُسجَّل الدفعة', 'The subscription was saved; the payment was not recorded:')} <Money n={half.amount} /></DS5.AlertTitle>
                <DS5.AlertDescription>{tr('لن يُحفظ الاشتراك مرة ثانية. أعد محاولة الدفعة وحدها، أو أغلق ويبقى المبلغ دينًا.', 'The subscription won’t be saved twice. Retry the payment alone, or close and the amount stays owed.')}</DS5.AlertDescription>
              </DS5.Alert>
              <MethodToggle value={method} onChange={setMethod} />
            </> : <>
              {askName && <DS5.Field label={tr('الاسم', 'Name')} error={err.name}><DS5.Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></DS5.Field>}
              {askPhone && (
                <DS5.Field label={tr('رقم الجوال', 'Mobile number')} labelEnd={unpaidAfter ? undefined : <Opt />} error={err.phone}>
                  <DS5.Input type="tel" dir="ltr" placeholder="+970 59 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </DS5.Field>
              )}
              {prior.length > 0 && (
                <DS5.Alert variant="warning">
                  <DS5.AlertTitle>{tr('مستحق من قبل', 'Owed from before:')} <Money n={priorTotal} /> · {prior.map(itemLabel).join(tr('، ', ', '))}</DS5.AlertTitle>
                  <DS5.AlertDescription>{tr('يُطبَّق المستلم عليه أولًا، ثم على التجديد.', 'What you receive pays it first, then the renewal.')}</DS5.AlertDescription>
                </DS5.Alert>
              )}
              {showPk ? (
                <DS5.Field label={tr('الباقة', 'Package')}>
                  <DS5.RadioGroup value={pk} onValueChange={(v) => { setPk(v); setPriceEdit(false); setPrice(''); setReceived(null); }}>
                    <p className="text-caption text-muted-foreground">{tr('منشورة للزوار', 'Published')}</p>
                    <div className="flex flex-col divide-y rounded-lg border border-border">
                      {D5.PACKAGES.filter((p) => p.isPublic).map((p) => <PkgOption key={p.id} value={p.id} title={p.name} amount={p.amount} terms={p.terms} />)}
                    </div>
                    <p className="pt-2 text-caption text-muted-foreground">{tr('خاصة بالمكتب — لا تظهر للزوار', 'Desk only — not shown to visitors')}</p>
                    <div className="flex flex-col divide-y rounded-lg border border-border">
                      {D5.PACKAGES.filter((p) => !p.isPublic).map((p) => <PkgOption key={p.id} value={p.id} title={p.name} amount={p.amount} terms={p.terms} tag={<DS5.Badge variant="neutral">{tr('خاصة', 'Private')}</DS5.Badge>} />)}
                      <PkgOption value="custom" title={tr('مخصّص', 'Custom')} terms={tr('حدّد الشروط والسعر بنفسك', 'Set the terms and price yourself')} />
                    </div>
                  </DS5.RadioGroup>
                </DS5.Field>
              ) : (
                // DK-007: a renewal is nearly always the same package — one line, and the list on demand.
                <div className="flex flex-col gap-2">
                  <span className="text-label">{tr('الباقة', 'Package')}</span>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                    <span className="text-label">{P.name} · <Money n={newDue} /> · {D5.fmtDate(start)} – {D5.fmtDate(end)}</span>
                    <DS5.Button type="button" variant="link" size="sm" className="px-0" onClick={() => setShowPk(true)}>{tr('تغيير الباقة', 'Change package')}</DS5.Button>
                  </div>
                </div>
              )}
              <div className="grid gap-3">
                <DateField label={tr('من', 'From')} value={start} onChange={setStart} />
                {custom ? <DateField label={tr('إلى', 'To')} labelEnd={<Opt />} error={err.to} value={cu.to} onChange={(x) => setC({ to: x })} />
                  : <DateField label={tr('إلى', 'To')} helper={tr('تُحسب من الباقة', 'From the package')} value={end} disabled onChange={() => {}} />}
                {endNote}
              </div>
              {!custom && (priceEdit ? (
                <DS5.Field label={tr('السعر (₪)', 'Price (₪)')} labelEnd={manual ? <DS5.Badge variant="info">{tr('سعر يدوي', 'Manual price')}</DS5.Badge> : null}>
                  <DS5.Input inputMode="numeric" dir="ltr" value={price} placeholder={String(P.amount)} onChange={(e) => { setPrice(e.target.value.replace(/[^\d]/g, '')); setReceived(null); }} autoFocus />
                </DS5.Field>
              ) : <DS5.Button type="button" variant="link" size="sm" className="self-start px-0" onClick={() => { setPriceEdit(true); setPrice(String(P.amount)); }}>{tr('تعديل السعر', 'Change price')}</DS5.Button>)}
              {custom && (
                <div className="flex flex-col gap-4 rounded-lg border border-border p-3">
                  <p className="text-caption text-muted-foreground">{tr('كل الحقول اختيارية ويمكن جمعها.', 'Every field is optional and they can be combined.')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <NumIn label={tr('عدد الأيام الكلي', 'Total days')} value={cu.totalDays} onChange={(v) => setC({ totalDays: v })} />
                    <NumIn label={tr('أيام بالأسبوع', 'Days a week')} value={cu.daysPerWeek} onChange={(v) => setC({ daysPerWeek: v })} />
                    <NumIn label={tr('ساعات باليوم', 'Hours a day')} value={cu.hoursPerDay} onChange={(v) => setC({ hoursPerDay: v })} />
                    <NumIn label={tr('رصيد ساعات', 'Hour balance')} value={cu.hourBalance} onChange={(v) => setC({ hourBalance: v })} />
                  </div>
                  <DS5.Field label={tr('طريقة الحساب', 'Billing')}>
                    <DS5.ToggleGroup type="single" value={cu.billing} onValueChange={(v) => { if (v) { setC({ billing: v }); setReceived(null); } }}>
                      <DS5.ToggleGroupItem value="fixed">{tr('سعر ثابت', 'Fixed price')}</DS5.ToggleGroupItem>
                      <DS5.ToggleGroupItem value="usage">{tr('حسب الاستخدام', 'By usage')}</DS5.ToggleGroupItem>
                    </DS5.ToggleGroup>
                  </DS5.Field>
                  {cu.billing === 'fixed' ? (
                    <DS5.Field label={tr('السعر (₪)', 'Price (₪)')} error={err.amount} labelEnd={cu.amount ? <DS5.Badge variant="info">{tr('سعر يدوي', 'Manual price')}</DS5.Badge> : null}><DS5.Input inputMode="numeric" dir="ltr" value={cu.amount} onChange={(e) => { setC({ amount: e.target.value.replace(/[^\d]/g, '') }); setReceived(null); }} /></DS5.Field>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      <DS5.Field label={tr('الوحدة', 'Unit')}>
                        <DS5.ToggleGroup type="single" value={cu.unit} onValueChange={(v) => v && setC({ unit: v, rate: String(v === 'hour' ? D5.PRICES.hour : D5.PRICES.day) })}>
                          <DS5.ToggleGroupItem value="hour">{tr('بالساعة', 'Per hour')}</DS5.ToggleGroupItem>
                          <DS5.ToggleGroupItem value="day">{tr('باليوم', 'Per day')}</DS5.ToggleGroupItem>
                        </DS5.ToggleGroup>
                      </DS5.Field>
                      <DS5.Field label={tr('السعر (₪)', 'Rate (₪)')} helper={manual ? undefined : tr('من السعر المنشور', 'From the published price')} labelEnd={manual ? <DS5.Badge variant="info">{tr('سعر يدوي', 'Manual price')}</DS5.Badge> : null}><DS5.Input inputMode="numeric" dir="ltr" value={cu.rate} onChange={(e) => setC({ rate: e.target.value.replace(/[^\d]/g, '') })} /></DS5.Field>
                    </div>
                  )}
                  {D5.SHIFT_LIST.length > 0 && (
                    <DS5.Field label={tr('الوردية', 'Shift')} labelEnd={<Opt />}>
                      <DS5.ToggleGroup type="single" value={cu.shift} onValueChange={(v) => setC({ shift: v || '' })}>
                        {D5.SHIFT_LIST.map((x) => <DS5.ToggleGroupItem key={x.id} value={x.id}>{D5.SHIFTS[x.id]}</DS5.ToggleGroupItem>)}
                      </DS5.ToggleGroup>
                    </DS5.Field>
                  )}
                  <DS5.Field label={tr('اسم الاشتراك', 'Subscription name')} labelEnd={<Opt />}><DS5.Input placeholder={tr('مخصّص', 'Custom')} value={cu.title} onChange={(e) => setC({ title: e.target.value })} /></DS5.Field>
                  <DS5.Field label={tr('ملاحظة', 'Note')} labelEnd={<Opt />}><DS5.Textarea rows={2} value={cu.note} onChange={(e) => setC({ note: e.target.value })} /></DS5.Field>
                </div>
              )}
              <MoneyBlock calc={calc} due={due} dueLabel={prior.length ? tr('المجموع', 'Total') : undefined} open={usage} value={value} onValue={setReceived} method={method} onMethod={setMethod}
                remainder={usage ? 'sub' : 'debt'} who={c ? c.name : name.trim() || tr('الزبون', 'the customer')} phoneNote={askPhone && !phoneOk(phone)} />
              <MoneyRateNote />
              <ActionAlert for="sheet">{MONEY_RETRY}</ActionAlert>
            </>}
          </DS5.SheetBody>
          <DS5.SheetFooter className="flex flex-row gap-2">
            {half
              ? <DS5.Button type="button" className="flex-1" loading={payRun.busy} onClick={() => payRun.run(() => desk.pay(half.customerId, half.amount, method, '', null))}>{tr('إعادة المحاولة: تسجيل', 'Try again: record')} <Money n={half.amount} /></DS5.Button>
              : <DS5.Button type="submit" className="flex-1" loading={busy}>{submitLabel}</DS5.Button>}
          </DS5.SheetFooter>
        </form>
      </DS5.SheetContent>
    </DS5.Sheet>
  );
}
Object.assign(window, { SubscriptionSheet });
