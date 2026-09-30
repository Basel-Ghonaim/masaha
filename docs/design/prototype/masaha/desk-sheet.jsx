// 4.5 New customer / new subscription / renewal — a 2-step sheet.
const DS5 = window.MasahaDesignSystem;
const D5 = window.DESK;

function PkgOption({ value, title, amount, terms, tag }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <DS5.Field orientation="horizontal" label={
        <span className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2"><span className="text-label">{title}</span>{tag}</span>
          <span className="text-caption text-muted-foreground">{terms}</span>
          {amount != null && <span className="text-body-sm"><Money n={amount} /></span>}
        </span>
      }><DS5.RadioGroupItem value={value} /></DS5.Field>
    </div>
  );
}
const Opt = () => <span className="text-caption text-muted-foreground">{tr('اختياري', 'Optional')}</span>;
const NumIn = ({ label, value, onChange, error }) => <DS5.Field label={label} labelEnd={<Opt />} error={error}><DS5.Input inputMode="numeric" dir="ltr" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))} /></DS5.Field>;

function SubscriptionSheet({ dlg, onClose }) {
  const desk = useDesk();
  const c = dlg && dlg.customerId ? D5.findCustomer(dlg.customerId) : null;
  const cur = c && D5.currentSub(c);
  const [step, setStep] = React.useState(1);
  const [name, setName] = React.useState(''); const [phone, setPhone] = React.useState('');
  const [pk, setPk] = React.useState('month'); const [start, setStart] = React.useState(D5.TODAY);
  const [priceEdit, setPriceEdit] = React.useState(false); const [price, setPrice] = React.useState('');
  const [cu, setCu] = React.useState({});
  const [payNow, setPayNow] = React.useState(false); const [payAmt, setPayAmt] = React.useState(''); const [method, setMethod] = React.useState('cash');
  const [err, setErr] = React.useState({});
  React.useEffect(() => {
    if (!dlg) return;
    setStep(c ? 2 : 1); setName(c ? c.name : dlg.name || ''); setPhone(c ? c.phone : '');
    const startPk = dlg.mode === 'renew' && cur ? cur.pkg : dlg.pkg || 'month';
    setPk(startPk);
    setStart(dlg.mode === 'renew' && cur && D5.subStatus(cur) !== 'expired' ? D5.addDays(cur.to, 1) : D5.TODAY);
    setPriceEdit(false); setPrice(''); setPayNow(!!dlg.payNow); setPayAmt(dlg.payNow || ''); setMethod('cash'); setErr({});
    setCu(dlg.custom || { to: '', totalDays: '', daysPerWeek: '', hoursPerDay: '', hourBalance: '', billing: 'fixed', amount: '', unit: 'hour', rate: String(D5.PRICES.hour), shift: '', title: '', note: '' });
  }, [dlg]);
  if (!dlg) return <DS5.Sheet open={false}><DS5.SheetContent closeLabel="" /></DS5.Sheet>;

  const P = D5.pkg(pk); const custom = pk === 'custom';
  const setC = (p) => setCu((x) => ({ ...x, ...p }));
  const publishedRate = cu.unit === 'hour' ? D5.PRICES.hour : D5.PRICES.day;
  const manual = custom ? (cu.billing === 'fixed' ? cu.amount !== '' : Number(cu.rate) !== publishedRate) : priceEdit && price !== '' && Number(price) !== P.amount;
  const usage = custom && cu.billing === 'usage';
  const dueAmt = usage ? null : custom ? Number(cu.amount) || 0 : priceEdit && price !== '' ? Number(price) : P.amount;
  const paidNow = payNow ? Number(payAmt) || 0 : 0;
  const remaining = usage ? null : Math.max(0, dueAmt - paidNow);
  const end = custom ? cu.to || D5.addDays(start, 29) : D5.addDays(start, P.days - 1);
  const debt = c ? D5.openItems(c).filter((i) => i.kind === 'sub') : [];
  const debtTotal = debt.reduce((a, i) => a + i.due - i.paid, 0);
  const oldSub = debt[0] && c.subs.find((s) => s.id === debt[0].id);

  const next = () => { if (!name.trim()) return setErr({ name: tr('أدخل الاسم', 'Enter the name') }); if (phone && !phoneOk(phone)) return setErr({ phone: tr('رقم غير مكتمل، مثل +970 59 000 0000', 'Incomplete number, e.g. +970 59 000 0000') }); setErr({}); setStep(2); };
  const save = (e) => {
    e.preventDefault();
    const x = {};
    if (custom && cu.billing === 'fixed' && !(Number(cu.amount) > 0)) x.amount = tr('أدخل السعر', 'Enter the price');
    if (custom && cu.to && cu.to < start) x.to = tr('تاريخ النهاية قبل البداية', 'The end is before the start');
    if (payNow && !(paidNow > 0)) x.pay = tr('أدخل مبلغ الدفعة', 'Enter the payment amount');
    if (payNow && !usage && paidNow > dueAmt) x.pay = tr('أكبر من المستحق', 'More than what’s due');
    if (Object.keys(x).length) return setErr(x);
    if ((usage || remaining > 0) && !phoneOk(phone)) { setStep(1); return setErr({ phone: tr('رقم الجوال مطلوب لأن جزءًا من المبلغ لم يُدفع بعد', 'A mobile number is needed because part of the amount is still unpaid') }); }
    const n = (v) => (v === '' || v == null ? undefined : Number(v));
    const sub = custom
      ? { id: 's' + Date.now(), pkg: 'custom', name: cu.title.trim() || tr('مخصّص', 'Custom'), from: start, to: end, terms: { totalDays: n(cu.totalDays), daysPerWeek: n(cu.daysPerWeek), hoursPerDay: n(cu.hoursPerDay), hourBalance: n(cu.hourBalance) }, used: {}, billing: usage ? { type: 'usage', unit: cu.unit, rate: Number(cu.rate) } : { type: 'fixed', amount: dueAmt }, manual, shift: cu.shift || null, note: cu.note }
      : { id: 's' + Date.now(), pkg: pk, name: P.name, from: start, to: end, terms: { totalDays: P.totalDays, daysPerWeek: P.daysPerWeek, hourBalance: P.hourBalance }, used: {}, billing: { type: 'fixed', amount: dueAmt }, manual };
    desk.saveSubscription({ customerId: c && c.id, name: name.trim(), phone }, sub, payNow ? { amount: paidNow, method } : null);
  };
  const title = dlg.mode === 'renew' ? tr('تجديد الاشتراك', 'Renew membership') : c ? tr('اشتراك جديد', 'New membership') : tr('زبون جديد', 'New customer');

  return (
    <DS5.Sheet open onOpenChange={(o) => !o && onClose()}>
      <DS5.SheetContent side="end" closeLabel={tr('إغلاق', 'Close')}>
        <DS5.SheetHeader>
          <DS5.SheetTitle>{title}</DS5.SheetTitle>
          <DS5.SheetDescription>{tr('الخطوة', 'Step')} <Num>{step}</Num> {tr('من', 'of')} <Num>2</Num> · {step === 1 ? tr('بيانات الزبون', 'Customer') : tr('الاشتراك', 'Membership')}{c && step === 2 ? ' · ' + c.name : ''}</DS5.SheetDescription>
        </DS5.SheetHeader>
        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); next(); } : save} noValidate className="flex min-h-0 flex-1 flex-col">
          <DS5.SheetBody className="flex flex-col gap-5 py-2">
            {step === 1 ? <>
              <DS5.Field label={tr('الاسم', 'Name')} error={err.name}><DS5.Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></DS5.Field>
              <DS5.Field label={tr('رقم الجوال', 'Mobile number')} labelEnd={<Opt />} error={err.phone} helper={!err.phone ? tr('مطلوب إذا بقي أي مبلغ غير مدفوع.', 'Required if anything stays unpaid.') : undefined}>
                <DS5.Input type="tel" dir="ltr" placeholder="+970 59 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </DS5.Field>
            </> : <>
              {dlg.mode === 'renew' && debtTotal > 0 && (
                <DS5.Alert variant="warning">
                  <DS5.AlertTitle><span>{tr('عليه', 'Owes')} <Money n={debtTotal} /> {tr('من', 'from')} {oldSub && (oldSub.debtLabel || oldSub.name)}</span></DS5.AlertTitle>
                  <DS5.AlertDescription>{tr('يمكنك التجديد الآن واستلام المبلغ لاحقًا.', 'You can renew now and collect it later.')}</DS5.AlertDescription>
                  <DS5.AlertAction><DS5.Button type="button" size="sm" variant="outline" onClick={() => desk.open('pay', { customerId: c.id })}>{tr('استلام دفعة', 'Receive payment')}</DS5.Button></DS5.AlertAction>
                </DS5.Alert>
              )}
              <DS5.Field label={tr('الباقة', 'Package')}>
                <DS5.RadioGroup value={pk} onValueChange={(v) => { setPk(v); setPriceEdit(false); setPrice(''); }}>
                  <p className="text-caption text-muted-foreground">{tr('منشورة للزوار', 'Published')}</p>
                  {D5.PACKAGES.filter((p) => p.isPublic).map((p) => <PkgOption key={p.id} value={p.id} title={p.name} amount={p.amount} terms={p.terms} />)}
                  <p className="pt-2 text-caption text-muted-foreground">{tr('خاصة بالمكتب — لا تظهر للزوار', 'Desk only — not shown to visitors')}</p>
                  {D5.PACKAGES.filter((p) => !p.isPublic).map((p) => <PkgOption key={p.id} value={p.id} title={p.name} amount={p.amount} terms={p.terms} tag={<DS5.Badge variant="neutral">{tr('خاصة', 'Private')}</DS5.Badge>} />)}
                  <PkgOption value="custom" title={tr('مخصّص', 'Custom')} terms={tr('حدّد الشروط والسعر بنفسك', 'Set the terms and price yourself')} />
                </DS5.RadioGroup>
              </DS5.Field>
              <div className="grid gap-3">
                <DateField label={tr('من', 'From')} value={start} onChange={setStart} />
                {custom ? <DateField label={tr('إلى', 'To')} labelEnd={<Opt />} error={err.to} value={cu.to} onChange={(x) => setC({ to: x })} />
                  : <DateField label={tr('إلى', 'To')} helper={tr('تُحسب من الباقة', 'From the package')} value={end} disabled onChange={() => {}} />}
              </div>
              {!custom && (priceEdit ? (
                <DS5.Field label={tr('السعر (₪)', 'Price (₪)')} labelEnd={manual ? <DS5.Badge variant="info">{tr('سعر يدوي', 'Manual price')}</DS5.Badge> : null}>
                  <DS5.Input inputMode="numeric" dir="ltr" value={price} placeholder={String(P.amount)} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ''))} autoFocus />
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
                    <DS5.ToggleGroup type="single" value={cu.billing} onValueChange={(v) => v && setC({ billing: v })}>
                      <DS5.ToggleGroupItem value="fixed">{tr('سعر ثابت', 'Fixed price')}</DS5.ToggleGroupItem>
                      <DS5.ToggleGroupItem value="usage">{tr('حسب الاستخدام', 'By usage')}</DS5.ToggleGroupItem>
                    </DS5.ToggleGroup>
                  </DS5.Field>
                  {cu.billing === 'fixed' ? (
                    <DS5.Field label={tr('السعر (₪)', 'Price (₪)')} error={err.amount} labelEnd={cu.amount ? <DS5.Badge variant="info">{tr('سعر يدوي', 'Manual price')}</DS5.Badge> : null}><DS5.Input inputMode="numeric" dir="ltr" value={cu.amount} onChange={(e) => setC({ amount: e.target.value.replace(/[^\d]/g, '') })} /></DS5.Field>
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
                  <DS5.Field label={tr('الوردية', 'Shift')} labelEnd={<Opt />}>
                    <DS5.ToggleGroup type="single" value={cu.shift} onValueChange={(v) => setC({ shift: v || '' })}>
                      <DS5.ToggleGroupItem value="am">{D5.SHIFTS.am}</DS5.ToggleGroupItem>
                      <DS5.ToggleGroupItem value="pm">{D5.SHIFTS.pm}</DS5.ToggleGroupItem>
                    </DS5.ToggleGroup>
                  </DS5.Field>
                  <DS5.Field label={tr('اسم الاشتراك', 'Membership name')} labelEnd={<Opt />}><DS5.Input placeholder={tr('مخصّص', 'Custom')} value={cu.title} onChange={(e) => setC({ title: e.target.value })} /></DS5.Field>
                  <DS5.Field label={tr('ملاحظة', 'Note')} labelEnd={<Opt />}><DS5.Textarea rows={2} value={cu.note} onChange={(e) => setC({ note: e.target.value })} /></DS5.Field>
                </div>
              )}
              <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <DS5.Field label={tr('دفعة الآن', 'Payment now')} orientation="horizontal"><DS5.Switch checked={payNow} onCheckedChange={(v) => { setPayNow(v); if (v && !payAmt && dueAmt) setPayAmt(String(dueAmt)); }} /></DS5.Field>
                {payNow && <div className="grid gap-3 md:grid-cols-2">
                  <DS5.Field label={tr('المبلغ (₪)', 'Amount (₪)')} error={err.pay} helper={tr('يمكن أن تكون دفعة جزئية.', 'A partial payment is fine.')}><DS5.Input inputMode="numeric" dir="ltr" value={payAmt} onChange={(e) => setPayAmt(e.target.value.replace(/[^\d]/g, ''))} /></DS5.Field>
                  <MethodToggle value={method} onChange={setMethod} />
                </div>}
              </div>
              <div className="flex flex-col gap-1 rounded-lg bg-muted p-4" aria-live="polite">
                {usage ? <span className="text-heading-3">{tr('يُحسب من الحضور:', 'Billed from attendance:')} <Money n={Number(cu.rate) || 0} /> {cu.unit === 'hour' ? tr('للساعة', 'per hour') : tr('لليوم', 'per day')}</span>
                  : <span className="text-heading-3">{tr('المستحق:', 'Due:')} <Money n={dueAmt} /></span>}
                {payNow && paidNow > 0 && <span className="text-body-sm">{tr('المدفوع الآن', 'Paid now')} <Money n={paidNow} />{remaining != null && <> · {tr('المتبقي', 'Left')} <Money n={remaining} /></>}</span>}
                <span className="text-caption text-muted-foreground">{D5.fmtDate(start, true)} – {D5.fmtDate(end, true)}</span>
              </div>
            </>}
          </DS5.SheetBody>
          <DS5.SheetFooter className="flex flex-row gap-2">
            {step === 1 ? <DS5.Button type="submit" className="w-full">{tr('التالي', 'Next')}<DS5.ArrowEndIcon /></DS5.Button> : <>
              <DS5.Button type="button" variant="outline" onClick={() => setStep(1)}><DS5.ArrowStartIcon />{tr('السابق', 'Back')}</DS5.Button>
              <DS5.Button type="submit" className="flex-1">{tr('حفظ الاشتراك', 'Save membership')}</DS5.Button>
            </>}
          </DS5.SheetFooter>
        </form>
      </DS5.SheetContent>
    </DS5.Sheet>
  );
}
Object.assign(window, { SubscriptionSheet });
