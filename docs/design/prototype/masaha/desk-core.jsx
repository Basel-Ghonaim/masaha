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
// K4: a stay and a payment in words, for a toast («4 س 35 د», «استُلم 12 ₪ نقدًا»).
const durText = (mins) => { const h = Math.floor(mins / 60), m = mins % 60; return LANG === 'en' ? (h ? h + 'h ' : '') + m + 'm' : (h ? h + ' س ' : '') + m + ' د'; };
const paidLine = (n, method) => tr(`استُلم ${$(n)} ${D.methodIn[method]}`, `${$(n)} received ${D.methodIn[method]}`);
// DK-018: a money request carries its key (ADR 0015), so its failure says a retry is safe.
const MONEY_RETRY = tr('لم يصل الرد. أعد المحاولة — لن تُسجَّل مرتين.', 'No answer came back. Try again — it won’t be recorded twice.');
// Foundation §10: a failed submit moves focus to the first invalid field of the open dialog or sheet.
const focusInvalid = () => setTimeout(() => { const bad = document.querySelector('[role=dialog] [aria-invalid="true"], [role=alertdialog] [aria-invalid="true"]'); if (bad) bad.focus(); });
// A day in a row's line: «اليوم», «أمس», or the date.
const dayWord = (iso) => (iso === D.TODAY ? tr('اليوم', 'today') : iso === D.addDays(D.TODAY, -1) ? tr('أمس', 'yesterday') : D.fmtDate(iso));
// O5's forms for the desk's own counted words.
const F_UNCOLLECTED = { ar: { one: 'زيارة واحدة غير محصّلة', two: 'زيارتان غير محصّلتين', few: '{n} زيارات غير محصّلة', many: '{n} زيارة غير محصّلة', other: '{n} زيارة غير محصّلة' }, en: ['{n} visit not collected', '{n} visits not collected'] };
// DK-010: a subscriber on a fixed price has nothing to settle at check-out, so it is one tap.
const isQuickOut = (p) => { if (p.kind !== 'sub') return false; const s = D.currentSub(D.findCustomer(p.customerId)); return !s || s.billing.type === 'fixed'; };

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
    // DK-020: a visit may be checked in as a customer, whose file it then joins.
    checkInVisit(name, student, shift, customerId) {
      D.present.unshift({ id: 'n' + Date.now(), kind: 'visit', name, student: !!student, shift, customerId: customerId || null, since: D.NOW });
      bump(); close(); toast.success(tr(`سُجّلت زيارة ${name}`, `Visit for ${name} checked in`));
    },
    // Subscriber check-in: one tap unless something needs a look; warnings never block.
    tapCheckIn(cid) {
      const w = checkInWarnings(cid);
      if (!w.length) return api.checkInSub(cid);
      open('warn', { customerId: cid, warnings: w });
    },
    // K2 + K7: `recorded` is what the ledger takes — never more than a visit's charge; `change` is
    // handed back. What stays unpaid becomes the debt of the visit's customer, found or made by phone.
    checkOut(pid, { recorded = 0, change = 0, method = 'cash', debt, due } = {}) {
      const i = D.present.findIndex((p) => p.id === pid); const p = D.present[i];
      D.present.splice(i, 1);
      const mins = D.toMin(D.NOW) - D.toMin(p.since);
      const c = p.customerId ? D.findCustomer(p.customerId) : null;
      const who = c ? c.name : p.name;
      let desc;
      if (p.kind === 'visit') {
        const charge = due != null ? due : D.visitCharge(p.since, D.NOW, p.student).amount;
        const left = charge - recorded;
        let debtor = c;
        if (left > 0 && !debtor) {
          const phone = normPhone(debt.phone);
          debtor = D.customers.find((x) => !x.archived && x.phone === phone);
          if (!debtor) { debtor = { id: 'c' + Date.now(), name: debt.name || p.name, phone, subs: [] }; D.customers.unshift(debtor); }
        }
        if (recorded > 0) D.visitPays.unshift({ id: 'vp' + Date.now(), customerId: debtor ? debtor.id : null, name: debtor ? debtor.name : p.name, date: D.TODAY, time: D.NOW, amount: recorded, method, by: ME });
        if (left > 0) D.unpaid.unshift({ id: 'u' + Date.now(), customerId: debtor.id, date: D.TODAY, in: p.since, out: D.NOW, amount: left, how: 'left' });
        desc = left > 0
          ? (recorded > 0 ? paidLine(recorded, method) + ' · ' : tr('لم يدفع · ', 'Not paid · ')) + tr(`المتبقي ${$(left)} دين على ${debtor.name}`, `${$(left)} left as a debt for ${debtor.name}`)
          : paidLine(recorded, method) + tr(' عن الزيارة', ' for the visit') + (change > 0 ? tr(` · الباقي للزبون ${$(change)}`, ` · ${$(change)} change`) : '');
      } else {
        const s = c && D.currentSub(c);
        if (s) { s.used.todayMin = (s.used.todayMin || 0) + mins; if (s.billing.type === 'usage' || s.terms.hourBalance) s.used.hours = (s.used.hours || 0) + Math.ceil(mins / 60); }
        desc = durText(mins);
        if (s && s.billing.type === 'usage') {
          if (recorded > 0) s.pays.push([D.TODAY, D.NOW, recorded, method, ME]);
          const left = Math.max(0, D.due(s, c) - D.paid(s));
          desc = (recorded > 0 ? paidLine(recorded, method) + tr(` عن ${s.name}`, ` for ${s.name}`) : tr('لم يدفع الآن', 'No payment now')) + (left > 0 ? tr(` · المتبقي ${$(left)} على الاشتراك`, ` · ${$(left)} left on the subscription`) : '');
        }
      }
      bump(); close();
      toast.success(tr(`سُجّل خروج ${who}`, `${who} checked out`), { description: desc });
    },
    // ADR 0010 rule 2: one payment per item, to one item or to the oldest first. A usage-based
    // subscription chosen alone takes more than it owes, as credit. K4: the toast names it all.
    pay(cid, amount, method, note, itemId, change = 0) {
      const c = D.findCustomer(cid);
      let left = amount; const parts = [];
      const items = D.openItems(c).filter((it) => !itemId || it.id === itemId);
      for (const it of items) {
        if (left <= 0) break;
        const s = it.kind === 'sub' ? c.subs.find((x) => x.id === it.id) : null;
        const take = s && s.billing.type === 'usage' && itemId ? left : Math.min(left, it.due - it.paid); left -= take;
        if (s) s.pays.push([D.TODAY, D.NOW, take, method, ME, null, note]);
        else { const u = D.unpaid.find((x) => x.id === it.id); u.amount -= take; if (u.amount <= 0) D.unpaid.splice(D.unpaid.indexOf(u), 1); D.visitPays.unshift({ id: 'vp' + Date.now() + it.id, customerId: c.id, name: c.name, date: D.TODAY, time: D.NOW, amount: take, method, by: ME }); }
        parts.push((s ? s.debtLabel || s.name : tr('زيارة ', 'Visit ') + D.fmtDate(it.date)) + ' ' + $(take));
      }
      bump(); close();
      toast.success(paidLine(amount, method), { description: c.name + ' · ' + parts.join(tr('، ', ', ')) + tr(` · المتبقي ${$(D.balance(c))}`, ` · ${$(D.balance(c))} left`) + (change > 0 ? tr(` · الباقي للزبون ${$(change)}`, ` · ${$(change)} change`) : '') });
    },
    // DK-012: a payment on an uncollected visit that has no customer.
    payVisit(uid, amount, method, note, change = 0) {
      const u = D.unpaid.find((x) => x.id === uid);
      u.amount -= amount; if (u.amount <= 0) D.unpaid.splice(D.unpaid.indexOf(u), 1);
      D.visitPays.unshift({ id: 'vp' + Date.now(), customerId: null, name: u.name, date: D.TODAY, time: D.NOW, amount, method, by: ME });
      bump(); close();
      toast.success(paidLine(amount, method), { description: u.name + tr(' · زيارة ', ' · visit of ') + D.fmtDate(u.date) + (u.amount > 0 ? tr(` · المتبقي ${$(u.amount)} غير محصّل`, ` · ${$(u.amount)} still uncollected`) : '') + (change > 0 ? tr(` · الباقي للزبون ${$(change)}`, ` · ${$(change)} change`) : '') });
    },
    // DK-012: «تسجيل دينًا» — the phone finds the customer or makes one, as at an unpaid check-out.
    attachDebt(uid, name, phone) {
      const u = D.unpaid.find((x) => x.id === uid); const ph = normPhone(phone);
      let c = D.customers.find((x) => !x.archived && x.phone === ph);
      if (!c) { c = { id: 'c' + Date.now(), name, phone: ph, subs: [] }; D.customers.unshift(c); }
      u.customerId = c.id;
      bump(); close();
      toast.success(tr(`سُجّل ${$(u.amount)} دينًا على ${c.name}`, `${$(u.amount)} recorded as a debt for ${c.name}`));
    },
    // K6: out of «غير محصّل» and the debt, kept with the reason, who and when.
    writeOff(uid, reason) {
      const u = D.unpaid.find((x) => x.id === uid); const who = u.customerId ? D.findCustomer(u.customerId).name : u.name;
      D.unpaid.splice(D.unpaid.indexOf(u), 1); D.writtenOff.push({ ...u, reason, by: ME, on: D.TODAY });
      bump(); close();
      toast.success(tr(`لن يُحصَّل ${$(u.amount)} · ${who}`, `${$(u.amount)} written off · ${who}`), { description: tr('السبب: ', 'Reason: ') + reason });
    },
    // K3 + K4: the subscription, then its money — on a renewal, oldest first across what was owed
    // before, one payment per item, the rest on the new subscription. `payment` null: the payment
    // failed after the save (DK-018), so the sheet stays open and nothing is said yet.
    saveSubscription({ customerId, name, phone }, sub, payment) {
      let c = customerId && D.findCustomer(customerId);
      if (!c) { c = { id: 'c' + Date.now(), name, phone: phone ? normPhone(phone) : '', subs: [] }; D.customers.unshift(c); }
      else if (!c.phone && phone) c.phone = normPhone(phone);
      const prior = payment && payment.renew ? D.openItems(c) : [];
      c.subs.unshift(sub);
      if (!payment) { bump(); return c; }
      let left = payment.recorded; const parts = [];
      for (const it of prior) {
        if (left <= 0) break;
        const take = Math.min(left, it.due - it.paid); left -= take;
        if (it.kind === 'sub') { const s = c.subs.find((x) => x.id === it.id); s.pays.push([D.TODAY, D.NOW, take, payment.method, ME]); parts.push((s.debtLabel || s.name) + ' ' + $(take)); }
        else { const u = D.unpaid.find((x) => x.id === it.id); u.amount -= take; if (u.amount <= 0) D.unpaid.splice(D.unpaid.indexOf(u), 1); D.visitPays.unshift({ id: 'vp' + Date.now() + it.id, customerId: c.id, name: c.name, date: D.TODAY, time: D.NOW, amount: take, method: payment.method, by: ME }); parts.push(tr('زيارة ', 'Visit ') + D.fmtDate(it.date) + ' ' + $(take)); }
      }
      if (left > 0) { sub.pays.push([D.TODAY, D.NOW, left, payment.method, ME]); parts.push(sub.name + ' ' + $(left)); }
      bump(); close();
      const owed = D.balance(c);
      toast.success(payment.renew ? tr(`جُدّد اشتراك ${c.name}`, `${c.name}’s subscription renewed`) : tr(`حُفظ الاشتراك · ${c.name}`, `Subscription saved · ${c.name}`), {
        description: sub.name + ' · ' + (payment.recorded > 0 ? paidLine(payment.recorded, payment.method) + (parts.length > 1 ? ': ' + parts.join(tr('، ', ', ')) : '') : tr('بدون دفع', 'No payment')) + (owed > 0 ? tr(` · المتبقي ${$(owed)} دين`, ` · ${$(owed)} owed`) : '')
      });
      return c;
    },
    // DK-014: archived, never deleted — out of the search and the desk, under «مؤرشف» in Customers.
    // P9: a settled customer is archived at once and can be put back from the toast.
    archive(cid) {
      const c = D.findCustomer(cid); c.archived = { by: ME, on: D.TODAY }; bump();
      toast(tr(`أُرشف ${c.name}`, `${c.name} archived`), { action: { label: tr('تراجع', 'Undo'), onClick: () => { delete c.archived; bump(); } } });
    },
    // A customer who owes is archived only after the dialog that names the debt, so there is
    // no undo after it: the confirmation was the decision.
    archiveOwing(cid) {
      const c = D.findCustomer(cid); c.archived = { by: ME, on: D.TODAY }; bump(); close();
      toast.success(tr(`أُرشف ${c.name} · عليه ${$(D.balance(c))}`, `${c.name} archived · owes ${$(D.balance(c))}`));
    },
    askArchive(cid) { if (D.balance(D.findCustomer(cid)) > 0) open('archive', { customerId: cid }); else api.archive(cid); },
    restore(cid) {
      const c = D.findCustomer(cid); delete c.archived; bump();
      toast.success(tr(`استُرجع ${c.name}`, `${c.name} restored`));
    },
    // DK-016: a void is the owner's, once, with the reason; the payment stays, struck (ADR 0010 rule 3).
    voidPayment(row, reason) {
      if (row.type === 'sub') { row.ref[5] = reason; row.ref[7] = ME; } else { row.ref.voided = reason; row.ref.voidedBy = ME; }
      bump(); close();
      toast.success(tr(`أُلغيت الدفعة ${$(row.amount)}`, `${$(row.amount)} payment voided`), { description: row.who + tr(' · السبب: ', ' · Reason: ') + reason });
    },
    saveCustomer(cid, name, phone) {
      const c = D.findCustomer(cid); c.name = name; c.phone = phone ? normPhone(phone) : '';
      bump(); close(); toast.success(tr(`حُفظت بيانات ${name}`, `${name}’s details saved`));
    }
  };
  return (
    <DeskCtx.Provider value={api}>
      {children}
      <VisitDialog dlg={dlg && dlg.kind === 'visit' ? dlg : null} onClose={close} />
      <WarnDialog dlg={dlg && dlg.kind === 'warn' ? dlg : null} onClose={close} />
      <CheckoutDialog dlg={dlg && dlg.kind === 'checkout' ? dlg : null} onClose={close} />
      <PayDialog dlg={dlg && dlg.kind === 'pay' ? dlg : null} onClose={close} />
      <DebtDialog dlg={dlg && dlg.kind === 'debt' ? dlg : null} onClose={close} />
      <WriteOffDialog dlg={dlg && dlg.kind === 'writeoff' ? dlg : null} onClose={close} />
      <EditCustomerDialog dlg={dlg && dlg.kind === 'edit' ? dlg : null} onClose={close} />
      <ArchiveDialog dlg={dlg && dlg.kind === 'archive' ? dlg : null} onClose={close} />
      <VoidDialog dlg={dlg && dlg.kind === 'void' ? dlg : null} onClose={close} />
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
    // K5: the model holds days a week as a count, so the warning is the count used up — never which days.
    if (s.terms.daysPerWeek && (s.used.week || 0) >= s.terms.daysPerWeek) w.push({ id: 'week', sub: s });
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

// 4.2 Customer card: who, where, what's left; its actions by state (DK-013). The name opens the file.
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
          <span className="text-label">{s ? s.name : tr('بدون اشتراك', 'No subscription')}</span>
          {s && <StatusBadge c={c} />}
          <BalanceBadge c={c} />
        </div>
        {s && <ul className="flex flex-col gap-1 text-body-sm text-muted-foreground">{D.progress(s, c).map((l, i) => <li key={i}>{l}</li>)}</ul>}
      </DK.CardContent>
      <DK.CardFooter><CustomerActions c={c} where="card" /></DK.CardFooter>
    </DK.Card>
  );
}

// DK-013: one set of a customer's actions, in one order, wherever they are. `full`: the Customers
// row, whose «⋯» holds them all; elsewhere the state's actions are buttons beside the «⋯».
function CustomerMenuItems({ c, full, where }) {
  const desk = useDesk();
  const here = D.presentOf(c.id); const bal = D.balance(c); const st = D.customerStatus(c);
  return (
    <>
      {full && <>
        {here
          ? <DK.DropdownMenuItem onSelect={() => (isQuickOut(here) ? desk.checkOut(here.id) : desk.open('checkout', { presentId: here.id }))}>{tr('خروج', 'Check out')}</DK.DropdownMenuItem>
          : <DK.DropdownMenuItem onSelect={() => desk.tapCheckIn(c.id)}>{tr('حضور', 'Check in')}</DK.DropdownMenuItem>}
        {bal > 0 && <DK.DropdownMenuItem onSelect={() => desk.open('pay', { customerId: c.id })}><span>{tr('استلام', 'Receive')} <Money n={bal} /></span></DK.DropdownMenuItem>}
        {(st === 'soon' || st === 'expired') && <DK.DropdownMenuItem onSelect={() => desk.open('sheet', { mode: 'renew', customerId: c.id })}>{tr('تجديد', 'Renew')}</DK.DropdownMenuItem>}
        <DK.DropdownMenuSeparator />
      </>}
      <DK.DropdownMenuItem onSelect={() => desk.open('sheet', { mode: 'subscribe', customerId: c.id })}>{tr('اشتراك جديد', 'New subscription')}</DK.DropdownMenuItem>
      <DK.DropdownMenuItem onSelect={() => desk.open('edit', { customerId: c.id })}>{tr('تعديل البيانات', 'Edit details')}</DK.DropdownMenuItem>
      {where !== 'file' && <DK.DropdownMenuItem asChild><a href={roleQ('Customer file.html?id=' + c.id)}>{tr('ملف الزبون', 'Customer file')}</a></DK.DropdownMenuItem>}
      {IS_OWNER && <><DK.DropdownMenuSeparator /><DK.DropdownMenuItem onSelect={() => desk.askArchive(c.id)}>{tr('أرشفة', 'Archive')}</DK.DropdownMenuItem></>}
    </>
  );
}
// On the desk's card and the file's header: «حضور» or «خروج» first; «استلام 42 ₪» only when they
// owe; «تجديد» only when ending soon or ended; the rest in «⋯». An archived customer: «استرجاع».
function CustomerActions({ c, where }) {
  const desk = useDesk();
  const here = D.presentOf(c.id); const bal = D.balance(c); const st = D.customerStatus(c);
  const size = where === 'card' ? 'sm' : undefined;
  if (c.archived) return IS_OWNER ? <DK.Button size={size} variant="outline" onClick={() => desk.restore(c.id)}>{tr('استرجاع', 'Restore')}</DK.Button> : null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {here ? <OutButton p={here} size={size} variant="primary" /> : <DK.Button size={size} onClick={() => desk.tapCheckIn(c.id)}><DK.LogInIcon />{tr('حضور', 'Check in')}</DK.Button>}
      {bal > 0 && <DK.Button size={size} variant="secondary" onClick={() => desk.open('pay', { customerId: c.id })}>{tr('استلام', 'Receive')} <Money n={bal} /></DK.Button>}
      {(st === 'soon' || st === 'expired') && <DK.Button size={size} variant="outline" onClick={() => desk.open('sheet', { mode: 'renew', customerId: c.id })}>{tr('تجديد', 'Renew')}</DK.Button>}
      <DK.DropdownMenu dir={DIR}>
        <DK.DropdownMenuTrigger asChild><DK.Button variant="ghost" size="icon" aria-label={tr('إجراءات أخرى: ', 'More actions: ') + c.name}><DK.EllipsisVerticalIcon /></DK.Button></DK.DropdownMenuTrigger>
        <DK.DropdownMenuContent align="end"><CustomerMenuItems c={c} where={where} /></DK.DropdownMenuContent>
      </DK.DropdownMenu>
    </div>
  );
}

// DK-014: the name and the mobile are put right at the desk (both roles). The mobile is where a debt
// reminder goes, and is unique among the space's customers that are not archived (PHONE_TAKEN).
function EditCustomerDialog({ dlg, onClose }) {
  const desk = useDesk();
  const c = dlg && D.findCustomer(dlg.customerId);
  const [name, setName] = React.useState(''); const [phone, setPhone] = React.useState(''); const [err, setErr] = React.useState({});
  const takenBy = (v) => (phoneOk(v) ? D.customers.find((x) => x.id !== (c && c.id) && !x.archived && x.phone === normPhone(v)) : null);
  const takenLine = (o) => tr('هذا الرقم مسجّل لزبون آخر: ', 'This number belongs to another customer: ') + o.name;
  // ?taken=1: the frame of PHONE_TAKEN — Salma's number typed, as the server answers it.
  React.useEffect(() => { if (c) { const other = dlg.taken ? D.findCustomer('m8') : null; setName(c.name); setPhone(other ? other.phone : c.phone || ''); setErr(other ? { phone: takenLine(other) } : {}); } }, [dlg]);
  const { busy, run } = useActionRun('edit');
  const submit = (e) => {
    e.preventDefault();
    const x = {}; const other = takenBy(phone);
    if (!name.trim()) x.name = tr('أدخل الاسم', 'Enter the name');
    if (phone && !phoneOk(phone)) x.phone = tr('رقم غير مكتمل، مثل +970 59 000 0000', 'Incomplete number, e.g. +970 59 000 0000');
    else if (other) x.phone = takenLine(other);
    setErr(x); if (Object.keys(x).length) return focusInvalid();
    run(() => desk.saveCustomer(c.id, name.trim(), phone));
  };
  return (
    <DK.Dialog open={!!c} onOpenChange={(o) => !o && onClose()}>
      <DK.DialogContent closeLabel={tr('إغلاق', 'Close')}>
        {c && <>
          <DK.DialogHeader><DK.DialogTitle>{tr('تعديل البيانات', 'Edit details')}</DK.DialogTitle><DK.DialogDescription>{c.name}</DK.DialogDescription></DK.DialogHeader>
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <DK.Field label={tr('الاسم', 'Name')} error={err.name}><DK.Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></DK.Field>
            <DK.Field label={tr('رقم الجوال', 'Mobile number')} labelEnd={<span className="text-caption text-muted-foreground">{tr('اختياري', 'Optional')}</span>} error={err.phone} helper={err.phone ? undefined : tr('إليه يُرسل تذكير الدين على واتساب.', 'Debt reminders go to this number on WhatsApp.')}>
              <DK.Input type="tel" dir="ltr" placeholder="+970 59 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </DK.Field>
            <ActionAlert for="edit" />
            <DK.DialogFooter><DK.Button type="submit" loading={busy}>{tr('حفظ', 'Save')}</DK.Button></DK.DialogFooter>
          </form>
        </>}
      </DK.DialogContent>
    </DK.Dialog>
  );
}

// P9 (DK-014): a customer who owes is archived only after the dialog that names the debt — no undo after.
function ArchiveDialog({ dlg, onClose }) {
  const desk = useDesk();
  const c = dlg && D.findCustomer(dlg.customerId);
  return (
    <DK.AlertDialog open={!!c} onOpenChange={(o) => !o && onClose()}>
      <DK.AlertDialogContent>
        <DK.AlertDialogHeader>
          <DK.AlertDialogTitle>{tr('أرشفة', 'Archive')} {c && c.name}{tr('؟', '?')}</DK.AlertDialogTitle>
          <DK.AlertDialogDescription>{tr('عليه', 'They owe')} <Money n={c ? D.balance(c) : 0} /> {tr('غير مسدّدة. يبقى المبلغ في سجله، ويخرج من البحث ومن المكتب، ويبقى تحت «مؤرشف» في الزبائن.', 'unpaid. The amount stays on their record; they leave the search and the desk, and stay under «Archived» in Customers.')}</DK.AlertDialogDescription>
        </DK.AlertDialogHeader>
        <DK.AlertDialogFooter>
          <DK.AlertDialogCancel>{tr('رجوع', 'Back')}</DK.AlertDialogCancel>
          <DK.AlertDialogAction variant="destructive" onClick={() => desk.archiveOwing(c.id)}>{tr('أرشفة رغم الدين', 'Archive anyway')}</DK.AlertDialogAction>
        </DK.AlertDialogFooter>
      </DK.AlertDialogContent>
    </DK.AlertDialog>
  );
}

function FullAlert() {
  return <DK.Alert variant="warning"><DK.AlertTitle><span>{tr('المساحة ممتلئة', 'The space is full')} <Num>{`${D.present.length}/${D.capacity}`}</Num></span></DK.AlertTitle><DK.AlertDescription>{tr('يمكنك التسجيل على أي حال؛ ستبقى حالتها للزوار «ممتلئ».', 'You can still check in; visitors keep seeing «Full».')}</DK.AlertDescription></DK.Alert>;
}

// 4.3 Visit: a name, with the name the search carried (DK-002), and only the choices the space uses
// (DK-023): «طالب» where it changes the rate, «الوردية» where the space has shifts, on the one now.
function VisitDialog({ dlg, onClose }) {
  const desk = useDesk();
  const [name, setName] = React.useState(''); const [student, setStudent] = React.useState(false); const [shift, setShift] = React.useState(''); const [err, setErr] = React.useState();
  React.useEffect(() => { if (dlg) { setName(dlg.name || ''); setStudent(false); setShift(D.currentShift()); setErr(); } }, [dlg]);
  const { busy, run } = useActionRun('visit');
  const submit = (e) => { e.preventDefault(); if (!name.trim()) { setErr(tr('أدخل الاسم', 'Enter the name')); return focusInvalid(); } run(() => desk.checkInVisit(name.trim(), student, shift || null)); };
  const r = D.visitRates(student);
  const rate = r.hour ? <>{tr('تُحسب', 'Charged')} <Money n={r.hour} /> {tr('للساعة', 'an hour')}{D.SETTINGS.cap && r.day ? <> · {tr('حتى', 'up to')} <Money n={r.day} /></> : null}.</>
    : r.day ? <>{tr('تُحسب بسعر اليوم', 'Charged at the day price')} <Money n={r.day} />.</> : tr('لا يوجد سعر منشور؛ تُدخل المبلغ عند الخروج.', 'No published price; you enter the amount at check-out.');
  return (
    <DK.Dialog open={!!dlg} onOpenChange={(o) => !o && onClose()}>
      <DK.DialogContent closeLabel={tr('إغلاق', 'Close')}>
        <DK.DialogHeader>
          <DK.DialogTitle>{tr('تسجيل زيارة', 'Check in a visit')}</DK.DialogTitle>
          <DK.DialogDescription>{rate} {tr('لا يُنشأ ملف زبون.', 'No customer record is created.')}</DK.DialogDescription>
        </DK.DialogHeader>
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {desk.full() && <FullAlert />}
          <DK.Field label={tr('الاسم', 'Name')} error={err}><DK.Input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></DK.Field>
          {D.STUDENT_VISITS && <DK.Field label={tr('طالب', 'Student')} orientation="horizontal"><DK.Switch checked={student} onCheckedChange={setStudent} /></DK.Field>}
          {D.SHIFT_LIST.length > 0 && (
            <DK.Field label={tr('الوردية', 'Shift')} labelEnd={<span className="text-caption text-muted-foreground">{tr('اختياري', 'Optional')}</span>}>
              <DK.ToggleGroup type="single" value={shift} onValueChange={(v) => setShift(v || '')}>
                {D.SHIFT_LIST.map((x) => <DK.ToggleGroupItem key={x.id} value={x.id}>{D.SHIFTS[x.id]}</DK.ToggleGroupItem>)}
              </DK.ToggleGroup>
            </DK.Field>
          )}
          <MoneyRateNote />
          <ActionAlert for="visit">{MONEY_RETRY}</ActionAlert>
          <DK.DialogFooter><DK.Button type="submit" loading={busy}><DK.LogInIcon />{desk.full() ? tr('تسجيل على أي حال', 'Check in anyway') : tr('تسجيل الزيارة', 'Check in')}</DK.Button></DK.DialogFooter>
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
    nosub: () => [tr('لا يوجد اشتراك', 'No subscription'), tr('يمكنك تسجيله كزيارة، أو إضافة اشتراك.', 'Check them in as a visit, or add a subscription.')],
    expired: (w) => [tr('انتهى الاشتراك', 'Subscription ended'), <>{w.sub.name} · {tr('انتهى في', 'ended')} {D.fmtDate(w.sub.to)}.</>],
    week: (w) => [tr('استُنفدت أيام هذا الأسبوع', 'This week’s days are used up'), D.progress(w.sub, c).find((l) => l.startsWith(tr('هذا الأسبوع', 'This week')))],
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
                <ActionButton actionKey="warn" onAction={() => desk.checkInVisit(c.name, !!c.student && D.STUDENT_VISITS, D.currentShift() || null, c.id)}>{tr('تسجيل كزيارة', 'Check in as a visit')}</ActionButton>
                <DK.Button variant="outline" onClick={() => desk.open('sheet', { mode: ids.includes('expired') ? 'renew' : 'subscribe', customerId: c.id })}>{ids.includes('expired') ? tr('تجديد', 'Renew') : tr('اشتراك جديد', 'New subscription')}</DK.Button>
              </> : <ActionButton actionKey="warn" onAction={() => desk.checkInSub(c.id)}>{tr('تسجيل على أي حال', 'Check in anyway')}</ActionButton>}
            <DK.Button variant="ghost" onClick={onClose}>{tr('رجوع', 'Back')}</DK.Button>
          </DK.DialogFooter>
        </>}
      </DK.DialogContent>
    </DK.Dialog>
  );
}

function MethodToggle({ value, onChange }) {
  return (
    <DK.Field label={tr('الطريقة', 'Method')}>
      <DK.ToggleGroup type="single" value={value} onValueChange={(v) => v && onChange(v)}>
        <DK.ToggleGroupItem value="cash">{D.methodLabel.cash}</DK.ToggleGroupItem>
        <DK.ToggleGroupItem value="transfer">{D.methodLabel.transfer}</DK.ToggleGroupItem>
      </DK.ToggleGroup>
    </DK.Field>
  );
}
const Row = ({ k, v }) => <div className="flex items-center justify-between gap-3 py-1"><dt className="text-body-sm text-muted-foreground">{k}</dt><dd className="text-label">{v}</dd></div>;

// K2: one money block wherever money is taken — what is due, what is received (filled with what is
// due), the method, and a live line: the debt that remains, or the change to give back. `open`: a
// usage-based subscription has no ceiling, so more than is due becomes credit, not change.
const moneyOf = (due, value, open) => {
  const rec = Math.max(0, Number(value) || 0);
  return open
    ? { rec, recorded: rec, left: Math.max(0, due - rec), change: 0, credit: Math.max(0, rec - due) }
    : { rec, recorded: Math.min(rec, due), left: Math.max(0, due - rec), change: Math.max(0, rec - due), credit: 0 };
};
function MoneyBlock({ calc, due, dueLabel, dueField, open, value, onValue, method, onMethod, error, remainder, who, phoneNote, none = true, children }) {
  const m = moneyOf(due, value, open);
  const rest = remainder === 'sub' ? tr('يبقى على اشتراك', 'stays on the subscription of') + ' ' + who
    : remainder === 'uncollected' ? tr('يبقى غير محصّل', 'stays uncollected')
    : tr('يصبح دينًا على', 'becomes a debt for') + ' ' + who;
  const line = m.change > 0 ? <>{tr('الباقي للزبون', 'Change to give back:')} <Money n={m.change} /></>
    : m.credit > 0 ? <>{tr('يصبح له رصيد', 'Becomes credit:')} <Money n={m.credit} /></>
    : m.left > 0 ? <>{tr('المتبقي', 'The remaining')} <Money n={m.left} /> {rest}{phoneNote ? tr(' — رقم الجوال مطلوب', ' — a mobile number is required') : ''}</>
    : due > 0 ? tr('يُسجَّل المبلغ كاملًا.', 'Paid in full.') : tr('لا شيء مستحق الآن.', 'Nothing is due now.');
  const nothing = () => { onValue('0'); setTimeout(() => { const tel = document.querySelector('[role=dialog] input[type=tel]'); if (tel) tel.focus(); }); };
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-muted p-3">
      {calc && <div className="flex flex-col gap-1 text-body-sm">{calc}</div>}
      {dueField || <p className="text-heading-3">{dueLabel || tr('المستحق', 'Due')} <Money n={due} /></p>}
      <div className="grid gap-4 md:grid-cols-2">
        <DK.Field label={tr('المستلم الآن (₪)', 'Received now (₪)')} error={error}><DK.Input inputMode="numeric" dir="ltr" value={value} onChange={(e) => onValue(e.target.value.replace(/[^\d]/g, ''))} /></DK.Field>
        {m.rec > 0 && <MethodToggle value={method} onChange={onMethod} />}
      </div>
      <p aria-live="polite" className="text-body-sm">{line}</p>
      {m.left > 0 && children}
      {none && m.rec > 0 && <DK.Button type="button" variant="outline" className="self-start" onClick={nothing}>{tr('لم يدفع شيئًا', 'Paid nothing')}</DK.Button>}
    </div>
  );
}

// DK-018: the 429 inside a money dialog says that nothing was recorded, so the retry is safe too.
function MoneyRateNote() {
  if (pageParams.get('state') !== 'ratelimit') return null;
  return <DK.Alert variant="warning"><DK.AlertTitle>{RATE_LIMIT_LINE}</DK.AlertTitle><DK.AlertDescription>{tr('لم يُسجَّل شيء. إعادة المحاولة بعد ذلك لن تسجّله مرتين.', 'Nothing was recorded. Trying again after that won’t record it twice.')}</DK.AlertDescription></DK.Alert>;
}

// «خروج» on a row, a card or the file: one tap for a fixed-price subscriber (DK-010), the dialog otherwise.
function OutButton({ p, size, variant = 'outline' }) {
  const desk = useDesk();
  const { busy, run } = useActionRun('checkout');
  const quick = isQuickOut(p);
  return <DK.Button size={size} variant={variant} loading={quick && busy} aria-label={tr('خروج ', 'Check out ') + nameOf(p)} onClick={() => (quick ? run(() => desk.checkOut(p.id)) : desk.open('checkout', { presentId: p.id }))}><DK.LogOutIcon />{tr('خروج', 'Check out')}</DK.Button>;
}

// 4.4 Check-out: a visit, or a subscriber billed from attendance.
function CheckoutDialog({ dlg, onClose }) {
  const desk = useDesk();
  const p = dlg && D.present.find((x) => x.id === dlg.presentId);
  const [received, setReceived] = React.useState(''); const [method, setMethod] = React.useState('cash');
  const [dName, setDName] = React.useState(''); const [dPhone, setDPhone] = React.useState(''); const [err, setErr] = React.useState({});
  const [manualAmt, setManualAmt] = React.useState('');
  const c = p && p.customerId ? D.findCustomer(p.customerId) : null;
  const s = p && p.kind === 'sub' && c ? D.currentSub(c) : null;
  const ch0 = p && p.kind === 'visit' ? D.visitCharge(p.since, D.NOW, p.student) : null;
  const ch = ch0 && (ch0.mode === 'manual' ? { ...ch0, amount: Number(manualAmt) || 0 } : ch0);
  // A usage-based subscriber: what the subscription owes so far, today included.
  const subDue = s ? Math.max(0, D.due(s, c) - D.paid(s)) : 0;
  const due = ch ? ch.amount : subDue;
  React.useEffect(() => { if (p) { setManualAmt(''); setReceived(dlg.received != null ? dlg.received : ch0 && ch0.mode === 'manual' ? '' : String(due)); setMethod('cash'); setDName(p.kind === 'visit' ? p.name : ''); setDPhone(''); setErr({}); } }, [dlg && dlg.presentId]);
  const { busy, run } = useActionRun('checkout');
  if (!p) return <DK.Dialog open={false}><DK.DialogContent closeLabel="" /></DK.Dialog>;
  const mins = D.toMin(D.NOW) - D.toMin(p.since);
  const m = moneyOf(due, received, !!s);
  // An unpaid visit needs a phone; a visit checked in as a customer already has its debtor (DK-020).
  const needPhone = !!ch && !c && m.left > 0;
  const match = needPhone && phoneOk(dPhone) ? D.customers.find((x) => !x.archived && x.phone === normPhone(dPhone)) : null;
  const finish = () => {
    if (ch && ch.mode === 'manual' && !(ch.amount > 0)) { setErr({ manual: tr('أدخل مبلغ الزيارة', 'Enter the visit amount') }); return focusInvalid(); }
    if (needPhone) {
      const e = {};
      if (!dName.trim()) e.name = tr('أدخل الاسم', 'Enter the name');
      if (!phoneOk(dPhone)) e.phone = tr('رقم الجوال مطلوب ليُسجَّل المبلغ دينًا، مثل +970 59 000 0000', 'A mobile number is needed to record the debt, e.g. +970 59 000 0000');
      setErr(e); if (Object.keys(e).length) return focusInvalid();
    }
    run(() => desk.checkOut(p.id, { recorded: m.recorded, change: m.change, method, due, debt: { name: dName.trim(), phone: dPhone } }));
  };
  // DK-021: the line says the space's own rule; the cap only when it is on and applied.
  const calc = ch && ch.mode === 'hour' ? <>
    <span><Num>{ch.hours}</Num> {tr('س', 'h')} × <Money n={ch.hour} /> = <Money n={ch.byHour} /> · {tr('تقريب لأعلى بعد', 'rounded up after')} <Counted n={D.SETTINGS.roundAfter} ar={F_MINUTES.ar} en={F_MINUTES.en} /></span>
    {ch.capped && <span>{tr('السقف: سعر اليوم', 'Cap: the day price')} <Money n={ch.day} /></span>}
  </> : ch && ch.mode === 'day' ? <span>{tr('لا يوجد سعر بالساعة — سعر اليوم', 'No hourly price — the day price')} <Money n={ch.day} /></span>
    : s ? <>
      <span>{s.name} · {tr('يُحسب من الحضور:', 'Billed from attendance:')} <Money n={s.billing.rate} /> {s.billing.unit === 'hour' ? tr('للساعة', 'per hour') : tr('لليوم', 'per day')}</span>
      <span>{tr('اليوم', 'Today')} <Num>{Math.ceil(mins / 60)}</Num> {tr('س', 'h')} · {tr('المدفوع', 'Paid')} <Money n={D.paid(s)} /></span>
    </> : null;
  const dueField = ch && ch.mode === 'manual' ? (
    <DK.Field label={tr('مبلغ الزيارة (₪)', 'Visit amount (₪)')} labelEnd={<DK.Badge variant="info">{tr('سعر يدوي', 'Manual price')}</DK.Badge>} helper={tr('لا يوجد سعر ساعة ولا سعر يوم منشور.', 'There’s no published hour or day price.')} error={err.manual}>
      <DK.Input inputMode="numeric" dir="ltr" value={manualAmt} onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ''); setManualAmt(v); setReceived(v); }} autoFocus />
    </DK.Field>
  ) : null;
  const label = m.recorded > 0 ? <>{tr('خروج واستلام', 'Check out and take')} <Money n={m.recorded} /></> : tr('خروج بدون دفع', 'Check out without paying');
  return (
    <DK.Dialog open onOpenChange={(o) => !o && onClose()}>
      <DK.DialogContent closeLabel={tr('إغلاق', 'Close')}>
        <DK.DialogHeader>
          <DK.DialogTitle>{tr('تسجيل خروج', 'Check out')} · {nameOf(p)}</DK.DialogTitle>
          <DK.DialogDescription>{p.kind === 'visit' ? tr('زيارة', 'Visit') + (p.student ? tr(' · طالب', ' · student') : '') : tr('مشترك · يُحسب من الحضور', 'Subscriber · billed from attendance')}</DK.DialogDescription>
        </DK.DialogHeader>
        <div className="flex flex-col gap-4">
          <dl className="flex flex-col divide-y">
            <Row k={tr('الدخول', 'In')} v={<Num>{p.since}</Num>} />
            <Row k={tr('الخروج', 'Out')} v={<Num>{D.NOW}</Num>} />
            <Row k={tr('المدة', 'Duration')} v={durLabel(mins)} />
          </dl>
          <MoneyBlock calc={calc} due={due} dueLabel={s ? tr('المستحق حتى الآن', 'Due so far') : undefined} dueField={dueField} open={!!s} value={received} onValue={setReceived} method={method} onMethod={setMethod}
            remainder={s ? 'sub' : 'debt'} who={c ? c.name : dName.trim() || p.name} phoneNote={needPhone}>
            {needPhone && (
              <div className="grid gap-3 md:grid-cols-2">
                <DK.Field label={tr('الاسم', 'Name')} error={err.name}><DK.Input value={dName} onChange={(e) => setDName(e.target.value)} /></DK.Field>
                <DK.Field label={tr('رقم الجوال', 'Mobile number')} error={err.phone} helper={match ? tr('يُضاف إلى ملف ', 'Added to the file of ') + match.name : undefined}><DK.Input type="tel" dir="ltr" placeholder="+970 59 000 0000" value={dPhone} onChange={(e) => setDPhone(e.target.value)} /></DK.Field>
              </div>
            )}
          </MoneyBlock>
          <MoneyRateNote />
          <ActionAlert for="checkout">{MONEY_RETRY}</ActionAlert>
        </div>
        <DK.DialogFooter className="flex flex-wrap gap-2">
          <DK.Button loading={busy} onClick={finish}><DK.LogOutIcon />{label}</DK.Button>
        </DK.DialogFooter>
      </DK.DialogContent>
    </DK.Dialog>
  );
}


// 4.6 Receive payment: a customer's open items, oldest first or one of them; or, from the uncollected
// list, one visit that has no customer (DK-012). The money block names what is recorded.
function PayDialog({ dlg, onClose }) {
  const desk = useDesk();
  const [cid, setCid] = React.useState(null); const [q, setQ] = React.useState('');
  const [item, setItem] = React.useState('auto'); const [amount, setAmount] = React.useState(''); const [method, setMethod] = React.useState('cash'); const [note, setNote] = React.useState(''); const [err, setErr] = React.useState();
  const v = dlg && dlg.visitId ? D.unpaid.find((x) => x.id === dlg.visitId) : null;
  const c = cid && D.findCustomer(cid);
  const items = c ? D.openItems(c) : [];
  const leftOf = (id) => { if (id === 'auto') return D.balance(c); const it = items.find((i) => i.id === id); return it ? it.due - it.paid : 0; };
  const chosen = c && item !== 'auto' ? c.subs.find((x) => x.id === item) : null;
  // A usage-based subscription takes more than it owes, as credit (ADR 0010 rule 4).
  const open = !!chosen && chosen.billing.type === 'usage';
  const due = v ? v.amount : c ? leftOf(item) : 0;
  React.useEffect(() => { if (dlg) { setCid(dlg.customerId || null); setQ(''); setItem(dlg.itemId || 'auto'); setMethod('cash'); setNote(''); setErr(); } }, [dlg]);
  React.useEffect(() => { if (v) setAmount(String(v.amount)); else if (c) setAmount(String(leftOf(item) || '')); }, [dlg, cid, item]);
  const term = q.trim();
  const results = term ? D.searchCustomers(term).slice(0, 6) : D.customers.filter((x) => !x.archived && D.balance(x) > 0).slice(0, 6);
  const m = moneyOf(due, amount, open);
  const { busy, run } = useActionRun('pay');
  const submit = (e) => {
    e.preventDefault();
    if (!(m.recorded > 0)) { setErr(tr('أدخل مبلغًا أكبر من صفر', 'Enter an amount above zero')); return focusInvalid(); }
    setErr();
    run(() => (v ? desk.payVisit(v.id, m.recorded, method, note, m.change) : desk.pay(c.id, m.recorded, method, note, item === 'auto' ? null : item, m.change)));
  };
  const how = (u) => <>{u.how === 'auto' ? tr('خروج تلقائي عند الإغلاق', 'Auto check-out at closing') : tr('خرج بدون دفع', 'Left without paying')} · {dayWord(u.date)} <Num>{u.in + '–' + u.out}</Num></>;
  const submitLabel = m.recorded > 0 ? <>{tr('تسجيل', 'Record')} <Money n={m.recorded} /></> : tr('تسجيل الدفعة', 'Record payment');
  const tail = (
    <>
      <DK.Field label={tr('ملاحظة', 'Note')} labelEnd={<span className="text-caption text-muted-foreground">{tr('اختياري', 'Optional')}</span>}><DK.Input value={note} onChange={(e) => setNote(e.target.value)} /></DK.Field>
      <MoneyRateNote />
      <ActionAlert for="pay">{MONEY_RETRY}</ActionAlert>
    </>
  );
  return (
    <DK.Dialog open={!!dlg} onOpenChange={(o) => !o && onClose()}>
      <DK.DialogContent closeLabel={tr('إغلاق', 'Close')}>
        <DK.DialogHeader>
          <DK.DialogTitle>{v ? tr('تحصيل زيارة', 'Collect a visit') + ' · ' + v.name : tr('استلام دفعة', 'Receive a payment') + (c ? ' · ' + c.name : '')}</DK.DialogTitle>
          <DK.DialogDescription>{v ? how(v) : c ? <>{tr('المتبقي عليه', 'Balance')} <Money n={D.balance(c)} /></> : tr('اختر الزبون', 'Choose the customer')}</DK.DialogDescription>
        </DK.DialogHeader>
        {v ? (
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <MoneyBlock due={due} value={amount} onValue={setAmount} method={method} onMethod={setMethod} error={err} remainder="uncollected" none={false} />
            {tail}
            <DK.DialogFooter className="flex flex-wrap gap-2"><DK.Button type="submit" loading={busy}>{submitLabel}</DK.Button></DK.DialogFooter>
          </form>
        ) : !c ? (
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
            <MoneyBlock due={due} open={open} value={amount} onValue={setAmount} method={method} onMethod={setMethod} error={err} remainder="debt" who={c.name} none={false} />
            {tail}
            <DK.DialogFooter className="flex flex-wrap gap-2">
              <DK.Button type="submit" loading={busy}>{submitLabel}</DK.Button>
              {!dlg.customerId && <DK.Button type="button" variant="ghost" onClick={() => setCid(null)}>{tr('زبون آخر', 'Another customer')}</DK.Button>}
            </DK.DialogFooter>
          </form>
        )}
      </DK.DialogContent>
    </DK.Dialog>
  );
}

// P9: an irreversible act felt by others asks with an AlertDialog whose reason is required — voiding
// a payment, and K6's write-off. The action repeats the verb, `destructive`; the dismiss is «رجوع».
function ReasonDialog({ open, onClose, title, description, action, actionKey, onConfirm }) {
  const [reason, setReason] = React.useState(''); const [err, setErr] = React.useState();
  React.useEffect(() => { if (open) { setReason(''); setErr(); } }, [open]);
  const { busy, run } = useActionRun(actionKey);
  const go = () => { if (!reason.trim()) { setErr(tr('اكتب السبب', 'Write the reason')); return focusInvalid(); } run(() => onConfirm(reason.trim())); };
  return (
    <DK.AlertDialog open={!!open} onOpenChange={(o) => !o && onClose()}>
      <DK.AlertDialogContent>
        <DK.AlertDialogHeader>
          <DK.AlertDialogTitle>{title}</DK.AlertDialogTitle>
          <DK.AlertDialogDescription>{description}</DK.AlertDialogDescription>
        </DK.AlertDialogHeader>
        <DK.Field label={tr('السبب', 'Reason')} error={err}><DK.Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></DK.Field>
        <ActionAlert for={actionKey} />
        <DK.AlertDialogFooter>
          <DK.AlertDialogCancel>{tr('رجوع', 'Back')}</DK.AlertDialogCancel>
          <DK.Button variant="destructive" loading={busy} onClick={go}>{action}</DK.Button>
        </DK.AlertDialogFooter>
      </DK.AlertDialogContent>
    </DK.AlertDialog>
  );
}

// K6: the owner's «لن يُحصَّل» — with a reason, recorded and audited; never a payment, never a deletion.
function WriteOffDialog({ dlg, onClose }) {
  const desk = useDesk();
  const u = dlg && D.unpaid.find((x) => x.id === dlg.visitId);
  const who = u ? (u.customerId ? D.findCustomer(u.customerId).name : u.name) : '';
  return (
    <ReasonDialog open={!!u} onClose={onClose} actionKey="writeoff" title={tr('لن يُحصَّل مبلغ هذه الزيارة؟', 'Write off this visit?')} action={tr('لن يُحصَّل', 'Write off')} onConfirm={(reason) => desk.writeOff(u.id, reason)}
      description={u && <>{who} · {D.fmtDate(u.date)} · <Money n={u.amount} />. {tr('تخرج الزيارة من «غير محصّل» ومن دين الزبون. ليست دفعة ولا حذفًا: تبقى في السجل مع السبب واسمك، ولا يمكن التراجع.', 'The visit leaves «Not collected» and the customer’s debt. It isn’t a payment or a deletion: it stays on record with the reason and your name, and it can’t be undone.')}</>} />
  );
}

// K4: a payment's amount — a voided one stays, struck through, with who voided it and why (ADR 0010
// rule 3); `method`: the method under it, as DK-017's five columns put it.
function PaidAmount({ r, method }) {
  return (
    <span className="flex flex-col">
      {r.voided ? <span className="strike text-muted-foreground"><Money n={r.amount} /></span> : <span className="text-label"><Money n={r.amount} /></span>}
      {method && <span className="text-caption text-muted-foreground">{D.methodLabel[r.method]}</span>}
      {r.voided && <span className="text-caption text-muted-foreground">{tr('ألغاها', 'Voided by')} {D.by(r.voidedBy)}: {r.voided}</span>}
    </span>
  );
}
// DK-016: the void sits in the row's «⋯», the destructive item, for the owner, on a payment not voided.
function PaymentMenu({ r }) {
  const desk = useDesk();
  if (!IS_OWNER || r.voided) return null;
  return (
    <DK.DropdownMenu dir={DIR}>
      <DK.DropdownMenuTrigger asChild><DK.Button variant="ghost" size="icon" aria-label={tr('إجراءات الدفعة: ', 'Payment actions: ') + D.money(r.amount) + ' · ' + r.who}><DK.EllipsisVerticalIcon /></DK.Button></DK.DropdownMenuTrigger>
      <DK.DropdownMenuContent align="end"><DK.DropdownMenuItem variant="destructive" onSelect={() => desk.open('void', { row: r })}>{tr('إلغاء الدفعة…', 'Void payment…')}</DK.DropdownMenuItem></DK.DropdownMenuContent>
    </DK.DropdownMenu>
  );
}
// P9 + DK-016: the AlertDialog repeats the amount, the customer and the date, and asks why.
function VoidDialog({ dlg, onClose }) {
  const desk = useDesk();
  const r = dlg && dlg.row;
  return (
    <ReasonDialog open={!!r} onClose={onClose} actionKey="void" title={tr('إلغاء الدفعة؟', 'Void this payment?')} action={tr('إلغاء الدفعة', 'Void payment')} onConfirm={(reason) => desk.voidPayment(r, reason)}
      description={r && <><Money n={r.amount} /> · {r.who} · {D.fmtDate(r.date)} · {D.methodLabel[r.method]}. {tr('تبقى ظاهرة مشطوبة مع السبب واسمك، ولا تُحسب في الدخل ولا في التسليم. لا يمكن التراجع.', 'It stays visible, struck through, with the reason and your name, and counts in neither income nor the handover. It can’t be undone.')}</>} />
  );
}

// DK-012: a visit with no customer (the automatic check-out closed it) becomes a debt by a name and a
// phone, which find the customer or make one — the rule of an unpaid check-out.
function DebtDialog({ dlg, onClose }) {
  const desk = useDesk();
  const u = dlg && D.unpaid.find((x) => x.id === dlg.visitId);
  const [name, setName] = React.useState(''); const [phone, setPhone] = React.useState(''); const [err, setErr] = React.useState({});
  React.useEffect(() => { if (u) { setName(u.name || ''); setPhone(''); setErr({}); } }, [dlg]);
  const { busy, run } = useActionRun('debt');
  const match = phoneOk(phone) ? D.customers.find((x) => !x.archived && x.phone === normPhone(phone)) : null;
  const submit = (e) => {
    e.preventDefault();
    const x = {};
    if (!name.trim()) x.name = tr('أدخل الاسم', 'Enter the name');
    if (!phoneOk(phone)) x.phone = tr('رقم الجوال مطلوب ليُسجَّل المبلغ دينًا، مثل +970 59 000 0000', 'A mobile number is needed to record the debt, e.g. +970 59 000 0000');
    setErr(x); if (Object.keys(x).length) return focusInvalid();
    run(() => desk.attachDebt(u.id, name.trim(), phone));
  };
  return (
    <DK.Dialog open={!!u} onOpenChange={(o) => !o && onClose()}>
      <DK.DialogContent closeLabel={tr('إغلاق', 'Close')}>
        {u && <>
          <DK.DialogHeader>
            <DK.DialogTitle>{tr('تسجيل دين', 'Record a debt')} · {u.name}</DK.DialogTitle>
            <DK.DialogDescription><Money n={u.amount} /> {tr('تبقى دينًا على صاحب هذا الرقم، ويُنشأ له ملف زبون إن لم يكن له ملف.', 'stays as a debt for the owner of this number; a customer record is created if there is none.')}</DK.DialogDescription>
          </DK.DialogHeader>
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <DK.Field label={tr('الاسم', 'Name')} error={err.name}><DK.Input value={name} onChange={(e) => setName(e.target.value)} /></DK.Field>
            <DK.Field label={tr('رقم الجوال', 'Mobile number')} error={err.phone} helper={match ? tr('يُضاف إلى ملف ', 'Added to the file of ') + match.name : undefined}><DK.Input type="tel" dir="ltr" placeholder="+970 59 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus /></DK.Field>
            <ActionAlert for="debt" />
            <DK.DialogFooter><DK.Button type="submit" loading={busy}>{tr('تسجيل الدين', 'Record the debt')}</DK.Button></DK.DialogFooter>
          </form>
        </>}
      </DK.DialogContent>
    </DK.Dialog>
  );
}

// An uncollected visit's row: on the desk with its name, its actions under it (the side column is
// narrow); in the customer's file without, on one line from 768. Its actions:
// «تحصيل», «تسجيل دينًا» when it has no customer (DK-012), and the owner's «لن يُحصَّل» (K6).
function UnpaidRow({ u, showName }) {
  const desk = useDesk();
  const c = u.customerId ? D.findCustomer(u.customerId) : null;
  const who = c ? c.name : u.name;
  const how = u.how === 'auto' ? tr('خروج تلقائي عند الإغلاق', 'Auto check-out at closing') : tr('خرج بدون دفع', 'Left without paying');
  return (
    <li className={'flex flex-col gap-2 px-5 py-3' + (showName ? '' : ' md:flex-row md:items-center md:justify-between')}>
      <div className="flex min-w-0 flex-col">
        {showName && (c ? <a className="text-label text-foreground" href={roleQ('Customer file.html?id=' + c.id)}>{who}</a> : <span className="text-label">{who}</span>)}
        <span className={showName ? 'text-caption text-muted-foreground' : 'text-body-sm'}>{how} · {dayWord(u.date)} <Num>{u.in + '–' + u.out}</Num></span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label"><Money n={u.amount} /></span>
        <DK.Button size="sm" variant="outline" onClick={() => (c ? desk.open('pay', { customerId: c.id, itemId: u.id }) : desk.open('pay', { visitId: u.id }))}>{tr('تحصيل', 'Collect')}</DK.Button>
        {!c && <DK.Button size="sm" variant="outline" onClick={() => desk.open('debt', { visitId: u.id })}>{tr('تسجيل دينًا', 'Record as a debt')}</DK.Button>}
        {IS_OWNER && (
          <DK.DropdownMenu dir={DIR}>
            <DK.DropdownMenuTrigger asChild><DK.Button variant="ghost" size="icon" aria-label={tr('إجراءات أخرى لزيارة ', 'More actions for the visit of ') + who}><DK.EllipsisVerticalIcon /></DK.Button></DK.DropdownMenuTrigger>
            <DK.DropdownMenuContent align="end"><DK.DropdownMenuItem variant="destructive" onSelect={() => desk.open('writeoff', { visitId: u.id })}>{tr('لن يُحصَّل…', 'Write off…')}</DK.DropdownMenuItem></DK.DropdownMenuContent>
          </DK.DropdownMenu>
        )}
      </div>
    </li>
  );
}

Object.assign(window, { DeskProvider, useDesk, CustomerCard, StatusBadge, BalanceBadge, Money, durLabel, nameOf, normPhone, phoneOk, checkInWarnings, MethodToggle, ME, durText, paidLine, MONEY_RETRY, focusInvalid, isQuickOut, moneyOf, MoneyBlock, MoneyRateNote, OutButton, dayWord, F_UNCOLLECTED, ReasonDialog, UnpaidRow, CustomerActions, CustomerMenuItems, PaidAmount, PaymentMenu });
