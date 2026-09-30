// Front-desk store + shared pieces (customer card, dialogs). Uses DK.* to avoid global name clashes.
const DK = window.MasahaDesignSystem;
const D = window.DESK;
const ME = IS_OWNER ? D.AHMAD : D.SAMI;
const $ = (n) => D.money(n);
const Money = ({ n }) => <Num>{$(n)}</Num>;
const durLabel = (mins) => { const h = Math.floor(mins / 60), m = mins % 60; return LANG === 'en' ? (h ? h + 'h ' : '') + m + 'm' : <>{h ? <><Num>{h}</Num> س </> : null}<Num>{m}</Num> د</>; };
const nameOf = (p) => (p.kind === 'visit' ? p.name : D.findCustomer(p.customerId).name);
const normPhone = (v) => { let d = (v || '').replace(/\D/g, ''); if (!d) return ''; if (d.startsWith('00')) d = d.slice(2); if (d.startsWith('0')) d = '970' + d.slice(1); if (!d.startsWith('970')) d = '970' + d; const r = d.slice(3); return '+970 ' + r.slice(0, 2) + ' ' + r.slice(2, 5) + ' ' + r.slice(5, 9); };
const phoneOk = (v) => normPhone(v).replace(/\D/g, '').length === 12;

const DeskCtx = React.createContext(null);
const useDesk = () => React.useContext(DeskCtx);

function DeskProvider({ children, initial }) {
  const [, bump] = React.useReducer((x) => x + 1, 0);
  const [dlg, setDlg] = React.useState(initial || null);
  const open = (kind, payload = {}) => setDlg({ kind, ...payload });
  const close = () => setDlg(null);
  const toast = DK.toast;
  const full = () => D.present.length >= D.capacity;

  const api = {
    D, open, close, bump, full,
    checkInSub(cid) {
      D.present.unshift({ id: 'n' + Date.now(), kind: 'sub', customerId: cid, since: D.NOW });
      bump(); close(); toast.success(tr(`سُجّل حضور ${D.findCustomer(cid).name}`, `${D.findCustomer(cid).name} checked in`));
    },
    checkInVisit(name, student, shift) {
      D.present.unshift({ id: 'n' + Date.now(), kind: 'visit', name, student, shift, since: D.NOW });
      bump(); close(); toast.success(tr(`سُجّلت زيارة ${name}`, `Visit for ${name} checked in`));
    },
    // Subscriber check-in: one tap unless something needs a look; warnings never block.
    tapCheckIn(cid) {
      const w = checkInWarnings(cid);
      if (!w.length) return api.checkInSub(cid);
      open('warn', { customerId: cid, warnings: w });
    },
    checkOut(pid, { received = 0, method = 'cash', debt, due } = {}) {
      const i = D.present.findIndex((p) => p.id === pid); const p = D.present[i];
      D.present.splice(i, 1);
      const mins = D.toMin(D.NOW) - D.toMin(p.since);
      if (p.kind === 'visit') {
        const charge = due != null ? due : D.visitCharge(p.since).amount;
        if (received > 0) D.visitPays.unshift({ id: 'vp' + Date.now(), name: p.name, date: D.TODAY, time: D.NOW, amount: received, method, by: ME });
        const left = charge - received;
        if (left > 0) {
          const phone = normPhone(debt.phone);
          let c = D.customers.find((x) => x.phone === phone);
          if (!c) { c = { id: 'c' + Date.now(), name: debt.name || p.name, phone, subs: [] }; D.customers.unshift(c); }
          D.unpaid.unshift({ id: 'u' + Date.now(), customerId: c.id, date: D.TODAY, in: p.since, out: D.NOW, amount: left, how: 'left' });
          toast(tr(`سُجّل خروج ${p.name} · عليه ${$(left)}`, `${p.name} checked out · owes ${$(left)}`));
        } else toast.success(tr(`سُجّل خروج ${p.name} · دُفع ${$(received)}`, `${p.name} checked out · paid ${$(received)}`));
      } else {
        const c = D.findCustomer(p.customerId); const s = D.currentSub(c);
        if (s) { s.used.todayMin = (s.used.todayMin || 0) + mins; if (s.billing.type === 'usage' || s.terms.hourBalance) s.used.hours = (s.used.hours || 0) + Math.ceil(mins / 60); }
        toast.success(tr(`سُجّل خروج ${c.name}`, `${c.name} checked out`));
      }
      bump(); close();
    },
    // Applies to one item, or to the oldest first.
    pay(cid, amount, method, note, itemId) {
      const c = D.findCustomer(cid);
      let left = amount;
      const items = D.openItems(c).filter((it) => !itemId || it.id === itemId);
      for (const it of items) {
        if (left <= 0) break;
        const take = Math.min(left, it.due - it.paid); left -= take;
        if (it.kind === 'sub') c.subs.find((s) => s.id === it.id).pays.push([D.TODAY, D.NOW, take, method, ME, null, note]);
        else { const u = D.unpaid.find((x) => x.id === it.id); u.amount -= take; u.paidToday = (u.paidToday || 0) + take; if (u.amount <= 0) D.unpaid.splice(D.unpaid.indexOf(u), 1); D.visitPays.unshift({ id: 'vp' + Date.now(), name: c.name, date: D.TODAY, time: D.NOW, amount: take, method, by: ME }); }
      }
      bump(); close();
      toast.success(tr(`تم تسجيل ${$(amount)} · المتبقي ${$(D.balance(c))}`, `${$(amount)} recorded · ${$(D.balance(c))} left`));
    },
    saveSubscription({ customerId, name, phone }, sub, payNow) {
      let c = customerId && D.findCustomer(customerId);
      if (!c) { c = { id: 'c' + Date.now(), name, phone: normPhone(phone), subs: [] }; D.customers.unshift(c); }
      else { c.name = name; c.phone = normPhone(phone) || c.phone; }
      sub.pays = payNow && payNow.amount > 0 ? [[D.TODAY, D.NOW, payNow.amount, payNow.method, ME]] : [];
      c.subs.unshift(sub);
      bump(); close();
      const left = sub.billing.type === 'fixed' ? sub.billing.amount - (payNow ? payNow.amount : 0) : null;
      toast.success(tr('حُفظ الاشتراك', 'Membership saved') + (left > 0 ? tr(` · المتبقي ${$(left)}`, ` · ${$(left)} left`) : ''), { description: c.name });
      return c;
    },
    archive(cid) {
      const i = D.customers.findIndex((c) => c.id === cid); const c = D.customers[i];
      D.customers.splice(i, 1); bump();
      toast(tr(`أُرشف ${c.name}`, `${c.name} archived`), { action: { label: tr('تراجع', 'Undo'), onClick: () => { D.customers.splice(i, 0, c); bump(); } } });
    }
  };
  return (
    <DeskCtx.Provider value={api}>
      {children}
      <VisitDialog open={dlg && dlg.kind === 'visit'} onClose={close} />
      <WarnDialog dlg={dlg && dlg.kind === 'warn' ? dlg : null} onClose={close} />
      <CheckoutDialog dlg={dlg && dlg.kind === 'checkout' ? dlg : null} onClose={close} />
      <PayDialog dlg={dlg && dlg.kind === 'pay' ? dlg : null} onClose={close} />
      {window.SubscriptionSheet && <SubscriptionSheet dlg={dlg && dlg.kind === 'sheet' ? dlg : null} onClose={close} />}
    </DeskCtx.Provider>
  );
}

function checkInWarnings(cid) {
  const c = D.findCustomer(cid); const s = D.currentSub(c); const w = [];
  const here = D.presentOf(cid);
  if (here) return [{ id: 'here', since: here.since, presentId: here.id }];
  if (!s) w.push({ id: 'nosub' });
  else if (D.subStatus(s) === 'expired') w.push({ id: 'expired', sub: s });
  else {
    if (s.terms.weekDays && !s.terms.weekDays.includes(D.TODAY_KEY)) w.push({ id: 'notday', sub: s });
    if (s.terms.hoursPerDay && (s.used.todayMin || 0) >= s.terms.hoursPerDay * 60) w.push({ id: 'hours', sub: s });
  }
  if (D.present.length >= D.capacity) w.push({ id: 'full' });
  return w;
}

function StatusBadge({ c }) { const [v, l] = D.statusBadge[D.customerStatus(c)]; return <DK.Badge variant={v}>{l}</DK.Badge>; }
function BalanceBadge({ c }) {
  const b = D.balance(c); if (b > 0) return <DK.Badge variant="warning"><span>{tr('عليه', 'Owes')} <Money n={b} /></span></DK.Badge>;
  const cr = D.credit(c); return cr > 0 ? <DK.Badge variant="success"><span>{tr('له رصيد', 'In credit')} <Money n={cr} /></span></DK.Badge> : null;
}

// 4.2 Customer card: who, where, what's left, one tap for each action.
function CustomerCard({ c }) {
  const desk = useDesk();
  const s = D.currentSub(c); const here = D.presentOf(c.id);
  return (
    <DK.Card>
      <DK.CardHeader>
        <DK.CardTitle><a href={roleQ('Customer file.html?id=' + c.id)} className="text-foreground">{c.name}</a></DK.CardTitle>
        <DK.CardDescription>{c.phone ? <span dir="ltr">{c.phone}</span> : tr('بدون رقم جوال', 'No mobile number')}</DK.CardDescription>
        <DK.CardAction>{here ? <DK.Badge variant="info"><span>{tr('حاضر منذ', 'Here since')} <Num>{here.since}</Num></span></DK.Badge> : <DK.Badge variant="neutral">{tr('غير حاضر', 'Not here')}</DK.Badge>}</DK.CardAction>
      </DK.CardHeader>
      <DK.CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-label">{s ? s.name : tr('بدون اشتراك', 'No membership')}</span>
          {s && <StatusBadge c={c} />}
          <BalanceBadge c={c} />
        </div>
        {s && <ul className="flex flex-col gap-1 text-body-sm text-muted-foreground">{D.progress(s, c).map((l, i) => <li key={i}>{l}</li>)}</ul>}
      </DK.CardContent>
      <DK.CardFooter className="flex flex-wrap gap-2">
        {here ? <DK.Button size="sm" variant="outline" onClick={() => desk.open('checkout', { presentId: here.id })}><DK.LogOutIcon />{tr('خروج', 'Check out')}</DK.Button>
          : <DK.Button size="sm" onClick={() => desk.tapCheckIn(c.id)}><DK.LogInIcon />{tr('حضور', 'Check in')}</DK.Button>}
        <DK.Button size="sm" variant={D.balance(c) > 0 ? 'secondary' : 'outline'} onClick={() => desk.open('pay', { customerId: c.id })}>{tr('دفع', 'Pay')}</DK.Button>
        {s && <DK.Button size="sm" variant="outline" onClick={() => desk.open('sheet', { mode: 'renew', customerId: c.id })}>{tr('تجديد', 'Renew')}</DK.Button>}
        <DK.Button size="sm" variant="outline" onClick={() => desk.open('sheet', { mode: 'subscribe', customerId: c.id })}>{tr('اشتراك جديد', 'New membership')}</DK.Button>
        <DK.Button size="sm" variant="ghost" asChild><a href={roleQ('Customer file.html?id=' + c.id)}>{tr('ملف الزبون', 'Customer file')}</a></DK.Button>
      </DK.CardFooter>
    </DK.Card>
  );
}

function FullAlert() {
  return <DK.Alert variant="warning"><DK.AlertTitle><span>{tr('المساحة ممتلئة', 'The space is full')} <Num>{`${D.present.length}/${D.capacity}`}</Num></span></DK.AlertTitle><DK.AlertDescription>{tr('يمكنك التسجيل على أي حال؛ ستبقى حالتها للزوار «ممتلئ».', 'You can still check in; visitors keep seeing «Full».')}</DK.AlertDescription></DK.Alert>;
}

// 4.3 Visit: a name only — no customer record.
function VisitDialog({ open, onClose }) {
  const desk = useDesk();
  const [name, setName] = React.useState(''); const [student, setStudent] = React.useState(false); const [shift, setShift] = React.useState(''); const [err, setErr] = React.useState();
  React.useEffect(() => { if (open) { setName(pageParams.get('vname') || ''); setStudent(false); setShift(''); setErr(); } }, [open]);
  const submit = (e) => { e.preventDefault(); if (!name.trim()) return setErr(tr('أدخل الاسم', 'Enter the name')); desk.checkInVisit(name.trim(), student, shift || null); };
  return (
    <DK.Dialog open={!!open} onOpenChange={(o) => !o && onClose()}>
      <DK.DialogContent closeLabel={tr('إغلاق', 'Close')}>
        <DK.DialogHeader>
          <DK.DialogTitle>{tr('تسجيل زيارة', 'Check in a visit')}</DK.DialogTitle>
          <DK.DialogDescription>{D.PRICES.hour ? <>{tr('تُحسب بالساعة', 'Charged by the hour')} (<Money n={D.PRICES.hour} />) {tr('وبحد أقصى سعر اليوم', 'up to the day price')} (<Money n={D.PRICES.day} />).</> : D.PRICES.day ? <>{tr('تُحسب بسعر اليوم', 'Charged at the day price')} (<Money n={D.PRICES.day} />).</> : tr('لا يوجد سعر منشور؛ تُدخل المبلغ عند الخروج.', 'No published price; you enter the amount at check-out.')} {tr('لا يُنشأ ملف زبون.', 'No customer record is created.')}</DK.DialogDescription>
        </DK.DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {desk.full() && <FullAlert />}
          <DK.Field label={tr('الاسم', 'Name')} error={err}><DK.Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></DK.Field>
          <DK.Field label={tr('طالب', 'Student')} orientation="horizontal"><DK.Switch checked={student} onCheckedChange={setStudent} /></DK.Field>
          <DK.Field label={tr('الوردية', 'Shift')} labelEnd={<span className="text-caption text-muted-foreground">{tr('اختياري', 'Optional')}</span>}>
            <DK.ToggleGroup type="single" value={shift} onValueChange={(v) => setShift(v || '')}>
              <DK.ToggleGroupItem value="am">{D.SHIFTS.am}</DK.ToggleGroupItem>
              <DK.ToggleGroupItem value="pm">{D.SHIFTS.pm}</DK.ToggleGroupItem>
            </DK.ToggleGroup>
          </DK.Field>
          <DK.DialogFooter><DK.Button type="submit"><DK.LogInIcon />{desk.full() ? tr('تسجيل على أي حال', 'Check in anyway') : tr('تسجيل الزيارة', 'Check in')}</DK.Button></DK.DialogFooter>
        </form>
      </DK.DialogContent>
    </DK.Dialog>
  );
}

function WarnDialog({ dlg, onClose }) {
  const desk = useDesk();
  const c = dlg && D.findCustomer(dlg.customerId);
  const texts = {
    here: (w) => [tr('حاضر الآن', 'Already here'), <>{tr('مسجّل حضوره منذ', 'Checked in since')} <Num>{w.since}</Num>.</>],
    nosub: () => [tr('لا يوجد اشتراك', 'No membership'), tr('يمكنك تسجيله كزيارة، أو إضافة اشتراك.', 'Check them in as a visit, or add a membership.')],
    expired: (w) => [tr('انتهى الاشتراك', 'Membership ended'), <>{w.sub.name} · {tr('انتهى في', 'ended')} {D.fmtDate(w.sub.to)}.</>],
    notday: (w) => [tr('اليوم ليس من أيامه', 'Today isn’t one of their days'), D.progress(w.sub, c).find((l) => l.startsWith(tr('أيامه', 'Days')))],
    hours: (w) => [tr('تجاوز ساعات اليوم', 'Over today’s hours'), D.progress(w.sub, c).find((l) => l.startsWith(tr('ساعات اليوم', 'Today')))],
    full: () => [tr('المساحة ممتلئة', 'The space is full'), <><Num>{`${D.present.length}/${D.capacity}`}</Num> · {tr('ستبقى حالتها للزوار «ممتلئ».', 'Visitors keep seeing «Full».')}</>]
  };
  const ids = dlg ? dlg.warnings.map((w) => w.id) : [];
  const asVisit = ids.includes('expired') || ids.includes('nosub');
  return (
    <DK.Dialog open={!!dlg} onOpenChange={(o) => !o && onClose()}>
      <DK.DialogContent closeLabel={tr('إغلاق', 'Close')}>
        {dlg && <>
          <DK.DialogHeader><DK.DialogTitle>{tr('تسجيل حضور', 'Check in')} · {c.name}</DK.DialogTitle><DK.DialogDescription>{tr('تنبيه فقط، ويمكنك المتابعة.', 'Just a heads-up — you can continue.')}</DK.DialogDescription></DK.DialogHeader>
          <div className="flex flex-col gap-3">
            {dlg.warnings.map((w) => { const [t, d] = texts[w.id](w); return <DK.Alert key={w.id} variant={w.id === 'here' ? 'info' : 'warning'}><DK.AlertTitle>{t}</DK.AlertTitle><DK.AlertDescription><span>{d}</span></DK.AlertDescription></DK.Alert>; })}
          </div>
          <DK.DialogFooter className="flex flex-wrap gap-2">
            {ids.includes('here') ? <DK.Button onClick={() => desk.open('checkout', { presentId: dlg.warnings[0].presentId })}><DK.LogOutIcon />{tr('تسجيل خروج', 'Check out')}</DK.Button>
              : asVisit ? <>
                <DK.Button onClick={() => desk.checkInVisit(c.name, !!c.student, null)}>{tr('تسجيل كزيارة', 'Check in as a visit')}</DK.Button>
                <DK.Button variant="outline" onClick={() => desk.open('sheet', { mode: ids.includes('expired') ? 'renew' : 'subscribe', customerId: c.id })}>{ids.includes('expired') ? tr('تجديد', 'Renew') : tr('اشتراك جديد', 'New membership')}</DK.Button>
              </> : <DK.Button onClick={() => desk.checkInSub(c.id)}>{tr('تسجيل على أي حال', 'Check in anyway')}</DK.Button>}
            <DK.Button variant="ghost" onClick={onClose}>{tr('إلغاء', 'Cancel')}</DK.Button>
          </DK.DialogFooter>
        </>}
      </DK.DialogContent>
    </DK.Dialog>
  );
}

function MethodToggle({ value, onChange }) {
  return (
    <DK.Field label={tr('طريقة الدفع', 'Method')}>
      <DK.ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v)}>
        <DK.ToggleGroupItem value="cash">{D.methodLabel.cash}</DK.ToggleGroupItem>
        <DK.ToggleGroupItem value="transfer">{D.methodLabel.transfer}</DK.ToggleGroupItem>
      </DK.ToggleGroup>
    </DK.Field>
  );
}
const Row = ({ k, v }) => <div className="flex items-center justify-between gap-3 py-1"><dt className="text-body-sm text-muted-foreground">{k}</dt><dd className="text-label">{v}</dd></div>;

// 4.4 Check-out
function CheckoutDialog({ dlg, onClose }) {
  const desk = useDesk();
  const p = dlg && D.present.find((x) => x.id === dlg.presentId);
  const [received, setReceived] = React.useState(''); const [method, setMethod] = React.useState('cash');
  const [debtMode, setDebtMode] = React.useState(false); const [dName, setDName] = React.useState(''); const [dPhone, setDPhone] = React.useState(''); const [err, setErr] = React.useState({});
  const [manualAmt, setManualAmt] = React.useState('');
  const ch0 = p && p.kind === 'visit' ? D.visitCharge(p.since) : null;
  const ch = ch0 && (ch0.mode === 'manual' ? { ...ch0, amount: Number(manualAmt) || 0 } : ch0);
  React.useEffect(() => { if (p) { setManualAmt(''); setReceived(ch && ch0.mode !== 'manual' ? String(ch.amount) : ''); setMethod('cash'); setDebtMode(!!dlg.debt); setDName(p.kind === 'visit' ? p.name : ''); setDPhone(dlg.debt ? '059' : ''); setErr({}); } }, [dlg && dlg.presentId]);
  if (!p) return <DK.Dialog open={false}><DK.DialogContent closeLabel="" /></DK.Dialog>;
  const mins = D.toMin(D.NOW) - D.toMin(p.since);
  const rec = Math.max(0, Number(received) || 0);
  const left = ch ? Math.max(0, ch.amount - (debtMode ? 0 : rec)) : 0;
  const needPhone = ch && (debtMode || left > 0);
  const finish = (noPay) => {
    if (!ch) return desk.checkOut(p.id);
    if (ch.mode === 'manual' && !(ch.amount > 0)) return setErr({ manual: tr('أدخل مبلغ الزيارة', 'Enter the visit amount') });
    const r = noPay ? 0 : Math.min(rec, ch.amount);
    if (ch.amount - r > 0) {
      if (!debtMode && !noPay && !needPhone) return;
      const e = {}; if (!dName.trim()) e.name = tr('أدخل الاسم', 'Enter the name'); if (!phoneOk(dPhone)) e.phone = tr('رقم الجوال مطلوب ليُسجَّل المبلغ دينًا، مثل +970 59 000 0000', 'A mobile number is needed to record the debt, e.g. +970 59 000 0000');
      setErr(e); if (Object.keys(e).length) return;
    }
    desk.checkOut(p.id, { received: r, method, due: ch.amount, debt: { name: dName.trim(), phone: dPhone } });
  };
  let subBlock = null;
  if (p.kind === 'sub') {
    const c = D.findCustomer(p.customerId); const s = D.currentSub(c);
    const lines = s ? D.progress(s, c) : [];
    subBlock = (
      <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
        <span className="text-label">{s ? s.name : tr('بدون اشتراك', 'No membership')}</span>
        <ul className="flex flex-col gap-1 text-body-sm">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
        {s && s.billing.type === 'usage' && <p className="text-body-sm">{tr('اليوم', 'Today')} <Num>{Math.ceil(mins / 60)}</Num> {tr('س', 'h')} · {tr('المستحق حتى الآن', 'Due so far')} <Money n={D.due(s, c)} /></p>}
      </div>
    );
  }
  return (
    <DK.Dialog open onOpenChange={(o) => !o && onClose()}>
      <DK.DialogContent closeLabel={tr('إغلاق', 'Close')}>
        <DK.DialogHeader>
          <DK.DialogTitle>{tr('تسجيل خروج', 'Check out')} · {nameOf(p)}</DK.DialogTitle>
          <DK.DialogDescription>{p.kind === 'visit' ? tr('زيارة', 'Visit') + (p.student ? tr(' · طالب', ' · student') : '') : tr('مشترك', 'Member')}</DK.DialogDescription>
        </DK.DialogHeader>
        <div className="flex flex-col gap-4">
          <dl className="flex flex-col divide-y">
            <Row k={tr('الدخول', 'In')} v={<Num>{p.since}</Num>} />
            <Row k={tr('الخروج', 'Out')} v={<Num>{D.NOW}</Num>} />
            <Row k={tr('المدة', 'Duration')} v={durLabel(mins)} />
            {ch && ch.mode === 'hour' && <Row k={tr('تُحسب', 'Charged as')} v={<>{<Num>{ch.hours}</Num>} {tr('س · تقريب لأعلى بعد 10 دقائق', 'h · rounded up after 10 min')}</>} />}
          </dl>
          {ch && <>
            {ch.mode === 'manual' ? (
              <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
                <p className="text-body-sm">{tr('لا يوجد سعر ساعة ولا سعر يوم منشور. أدخل مبلغ الزيارة.', 'There’s no published hour or day price. Enter the visit amount.')}</p>
                <DK.Field label={tr('مبلغ الزيارة (₪)', 'Visit amount (₪)')} labelEnd={<DK.Badge variant="info">{tr('سعر يدوي', 'Manual price')}</DK.Badge>} error={err.manual}>
                  <DK.Input inputMode="numeric" dir="ltr" value={manualAmt} onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ''); setManualAmt(v); setReceived(v); }} autoFocus />
                </DK.Field>
              </div>
            ) : (
              <div className="flex flex-col gap-1 rounded-lg bg-muted p-3">
                {ch.mode === 'day' ? <span className="text-body-sm">{tr('لا يوجد سعر بالساعة — سعر اليوم', 'No hourly price — day price')} <Money n={D.PRICES.day} /></span> : <>
                  <span className="text-body-sm">{<Num>{ch.hours}</Num>} {tr('س', 'h')} × <Money n={D.PRICES.hour} /> = <Money n={ch.byHour} /></span>
                  {ch.capped && <span className="text-body-sm">{tr('السقف: سعر اليوم', 'Cap: day price')} <Money n={D.PRICES.day} /></span>}
                </>}
                <span className="text-heading-3">{tr('المستحق', 'Due')} <Money n={ch.amount} /></span>
              </div>
            )}
            {!debtMode && <div className="grid gap-4 md:grid-cols-2">
              <DK.Field label={tr('المبلغ المستلم (₪)', 'Amount received (₪)')}><DK.Input inputMode="numeric" dir="ltr" value={received} onChange={(e) => setReceived(e.target.value.replace(/[^\d]/g, ''))} /></DK.Field>
              <MethodToggle value={method} onChange={setMethod} />
            </div>}
            {needPhone && (
              <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <p className="text-body-sm">{tr('المتبقي', 'Remaining')} <Money n={left} /> {tr('يصبح دينًا عليه، ويُنشأ له ملف زبون.', 'becomes a debt, and a customer record is created.')}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <DK.Field label={tr('الاسم', 'Name')} error={err.name}><DK.Input value={dName} onChange={(e) => setDName(e.target.value)} /></DK.Field>
                  <DK.Field label={tr('رقم الجوال', 'Mobile number')} error={err.phone}><DK.Input type="tel" dir="ltr" placeholder="+970 59 000 0000" value={dPhone} onChange={(e) => setDPhone(e.target.value)} /></DK.Field>
                </div>
              </div>
            )}
          </>}
          {subBlock}
        </div>
        <DK.DialogFooter className="flex flex-wrap gap-2">
          {ch ? (debtMode ? <>
            <DK.Button onClick={() => finish(true)}>{tr('تأكيد الخروج بدون دفع', 'Confirm check-out without paying')}</DK.Button>
            <DK.Button variant="ghost" onClick={() => setDebtMode(false)}>{tr('رجوع', 'Back')}</DK.Button>
          </> : <>
            <DK.Button onClick={() => finish(false)}>{tr('خروج ودفع', 'Check out and pay')}</DK.Button>
            <DK.Button variant="outline" onClick={() => setDebtMode(true)}>{tr('خروج بدون دفع', 'Check out without paying')}</DK.Button>
          </>) : <DK.Button onClick={() => finish()}><DK.LogOutIcon />{tr('تسجيل خروج', 'Check out')}</DK.Button>}
        </DK.DialogFooter>
      </DK.DialogContent>
    </DK.Dialog>
  );
}

// 4.6 Receive payment
function PayDialog({ dlg, onClose }) {
  const desk = useDesk();
  const [cid, setCid] = React.useState(null); const [q, setQ] = React.useState('');
  const [item, setItem] = React.useState('auto'); const [amount, setAmount] = React.useState(''); const [method, setMethod] = React.useState('cash'); const [note, setNote] = React.useState(''); const [err, setErr] = React.useState();
  const c = cid && D.findCustomer(cid);
  const items = c ? D.openItems(c) : [];
  const leftOf = (id) => { if (id === 'auto') return D.balance(c); const it = items.find((i) => i.id === id); return it ? it.due - it.paid : 0; };
  React.useEffect(() => { if (dlg) { setCid(dlg.customerId || null); setQ(''); setItem(dlg.itemId || 'auto'); setMethod('cash'); setNote(''); setErr(); } }, [dlg]);
  React.useEffect(() => { if (c) setAmount(String(leftOf(item) || '')); }, [cid, item]);
  const term = q.trim(); const digits = term.replace(/\D/g, '');
  const results = term ? D.customers.filter((x) => x.name.includes(term) || (digits.length >= 3 && x.phone.replace(/\D/g, '').endsWith(digits))).slice(0, 6) : D.customers.filter((x) => D.balance(x) > 0).slice(0, 6);
  const submit = (e) => { e.preventDefault(); const n = Number(amount); if (!(n > 0)) return setErr(tr('أدخل مبلغًا أكبر من صفر', 'Enter an amount above zero')); if (n > leftOf(item)) return setErr(tr(`أكبر من المتبقي (${$(leftOf(item))})`, `More than what’s left (${$(leftOf(item))})`)); desk.pay(c.id, n, method, note, item === 'auto' ? null : item); };
  return (
    <DK.Dialog open={!!dlg} onOpenChange={(o) => !o && onClose()}>
      <DK.DialogContent closeLabel={tr('إغلاق', 'Close')}>
        <DK.DialogHeader>
          <DK.DialogTitle>{tr('استلام دفعة', 'Receive a payment')}{c ? ' · ' + c.name : ''}</DK.DialogTitle>
          <DK.DialogDescription>{c ? <>{tr('المتبقي عليه', 'Balance')} <Money n={D.balance(c)} /></> : tr('اختر الزبون', 'Choose the customer')}</DK.DialogDescription>
        </DK.DialogHeader>
        {!c ? (
          <div className="flex flex-col gap-3">
            <DK.Input role="searchbox" aria-label={tr('ابحث بالاسم أو آخر أرقام الجوال', 'Search by name or last digits')} placeholder={tr('الاسم أو آخر أرقام الجوال', 'Name or last digits of the mobile')} startIcon={<DK.SearchIcon />} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
            {!term && <p className="text-caption text-muted-foreground">{tr('عليهم مبالغ:', 'Customers who owe:')}</p>}
            <ul className="flex flex-col divide-y rounded-lg border border-border">
              {results.length ? results.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="flex min-w-0 flex-col"><span className="text-label">{x.name}</span><span dir="ltr" className="self-start text-caption text-muted-foreground">{x.phone}</span></span>
                  <span className="flex items-center gap-2"><BalanceBadge c={x} /><DK.Button size="sm" variant="outline" onClick={() => setCid(x.id)}>{tr('اختيار', 'Choose')}</DK.Button></span>
                </li>
              )) : <li className="px-3 py-3 text-body-sm text-muted-foreground">{tr('لا يوجد زبون بهذا الاسم أو الرقم.', 'No customer with this name or number.')}</li>}
            </ul>
          </div>
        ) : items.length === 0 ? (
          <p className="text-body">{tr('لا يوجد مبلغ مستحق على هذا الزبون.', 'This customer owes nothing.')}</p>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <DK.Field label={tr('تُطبَّق الدفعة على', 'Apply the payment to')}>
              <DK.RadioGroup value={item} onValueChange={setItem}>
                <DK.Field label={tr('الأقدم أولًا', 'Oldest first')} orientation="horizontal"><DK.RadioGroupItem value="auto" /></DK.Field>
                {items.map((it) => (
                  <DK.Field key={it.id} orientation="horizontal" label={<span className="flex flex-col"><span>{it.label}</span><span className="text-caption text-muted-foreground">{tr('المستحق', 'Due')} <Money n={it.due} /> · {tr('المدفوع', 'Paid')} <Money n={it.paid} /> · {tr('المتبقي', 'Left')} <Money n={it.due - it.paid} /></span></span>}><DK.RadioGroupItem value={it.id} /></DK.Field>
                ))}
              </DK.RadioGroup>
            </DK.Field>
            <div className="grid gap-4 md:grid-cols-2">
              <DK.Field label={tr('المبلغ (₪)', 'Amount (₪)')} error={err}><DK.Input inputMode="numeric" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))} /></DK.Field>
              <MethodToggle value={method} onChange={setMethod} />
            </div>
            <DK.Field label={tr('ملاحظة', 'Note')} labelEnd={<span className="text-caption text-muted-foreground">{tr('اختياري', 'Optional')}</span>}><DK.Input value={note} onChange={(e) => setNote(e.target.value)} /></DK.Field>
            <DK.DialogFooter className="flex flex-wrap gap-2">
              <DK.Button type="submit">{tr('تسجيل الدفعة', 'Record payment')}</DK.Button>
              {!dlg.customerId && <DK.Button type="button" variant="ghost" onClick={() => setCid(null)}>{tr('زبون آخر', 'Another customer')}</DK.Button>}
            </DK.DialogFooter>
          </form>
        )}
      </DK.DialogContent>
    </DK.Dialog>
  );
}

Object.assign(window, { DeskProvider, useDesk, CustomerCard, StatusBadge, BalanceBadge, Money, durLabel, nameOf, normPhone, phoneOk, checkInWarnings, MethodToggle, ME });
