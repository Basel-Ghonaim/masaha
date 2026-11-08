const { Checkbox: QCheckbox, Field: QField, Input: QInput, Select: QSelect, SelectTrigger: QTrigger, SelectValue: QValue, SelectContent: QContent, SelectItem: QItem, Button: QButton, Badge: QBadge, Switch: QSwitch, Table: QTable, TableHeader: QTHead, TableBody: QTBody, TableRow: QTr, TableHead: QTh, TableCell: QTd, AlertDialog: QAlert, AlertDialogContent: QAlertContent, AlertDialogHeader: QAlertHeader, AlertDialogTitle: QAlertTitle, AlertDialogDescription: QAlertDescription, AlertDialogFooter: QAlertFooter, AlertDialogCancel: QAlertCancel, AlertDialogAction: QAlertAction, XIcon: QX } = window.MasahaDesignSystem;

// Placeholder line icons, drawn here: the bundle has none for amenities or contact types (the
// platform's eight amenity icon keys, AD-027, and a generic one). The final set is chosen in code.
const PF_ICON_PATHS = {
  wifi: 'M2 8.8a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01',
  zap: 'M13 2 4 14h7l-1 8 9-12h-7z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  'plug-zap': 'M6 2v4M14 2v4M4 6h12v4a6 6 0 0 1-12 0zM10 16v6M19 13l-2 3h3l-2 3',
  coffee: 'M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2 2 0 0 1 0 4h-2M8 2v3M12 2v3',
  users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6',
  presentation: 'M2 4h20M4 4v10h16V4M12 14v4M8 21l4-3 4 3',
  'graduation-cap': 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',
  check: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.5 12.5l2.5 2.5 4.5-5',
  chat: 'M4 20l1.5-4A8 8 0 1 1 9 19.3z',
  phone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  camera: 'M4 7h3l2-3h6l2 3h3v12H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  thumb: 'M7 10v10H4V10zM7 10l4-7a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 16.6 20H7',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  hash: 'M4 9h16M4 15h16M10 3 8 21M16 3l-2 18',
  briefcase: 'M3 7h18v13H3zM8 7V4h8v3M3 13h18',
  play: 'M3 5h18v14H3zM10 9v6l5-3z',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'
};
const PfIcon = ({ name, className }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className || 'size-5 shrink-0 text-primary'}><path d={PF_ICON_PATHS[name] || PF_ICON_PATHS.check} /></svg>;

// Times are chosen, not typed (W5): a list every 30 minutes. An end may be 24:00, the day's own end
// (DI-15); a saved time off the list is kept in it.
const PF_TIMES = Array.from({ length: 48 }, (_, i) => String(Math.floor(i / 2)).padStart(2, '0') + ':' + (i % 2 ? '30' : '00'));
const PF_ENDS = PF_TIMES.slice(1).concat(['24:00']);
function PfTime({ label, value, onChange, end, error, srOnly }) {
  const list = (end ? PF_ENDS : PF_TIMES).slice();
  if (value && !list.includes(value)) { list.push(value); list.sort(); }
  return (
    <QField label={srOnly ? <span className="sr-only">{label}</span> : label} error={error}>
      <QSelect value={value} onValueChange={onChange}>
        <QTrigger className="w-full" dir="ltr"><QValue /></QTrigger>
        <QContent>{list.map((t) => <QItem key={t} value={t}><Ltr>{t}</Ltr></QItem>)}</QContent>
      </QSelect>
    </QField>
  );
}
function PfPick({ label, value, onChange, options, error, srOnly, disabled }) {
  return (
    <QField label={srOnly ? <span className="sr-only">{label}</span> : label} error={error}>
      <QSelect value={value} onValueChange={onChange} disabled={disabled}>
        <QTrigger className="w-full"><QValue /></QTrigger>
        <QContent>{options.map(([v, l]) => <QItem key={v} value={v}>{l}</QItem>)}</QContent>
      </QSelect>
    </QField>
  );
}
// A row's remove button, level with its fields from 768 (the label row above them).
const PfRemove = ({ label, onClick, disabled }) => <div className="pf-remove flex justify-end"><QButton type="button" variant="ghost" size="icon" aria-label={label} disabled={disabled} onClick={onClick}><QX /></QButton></div>;

// ---------------------------------------------------------------------------------------------
// الأسعار المعلنة (R1, R2, R6–R9): «سعر», never «اشتراك» (R8). The model stays (R2): a period, an
// audience, an optional shift, an amount; a label already saved is shown and kept, never edited.
// ---------------------------------------------------------------------------------------------
const PF_PERIODS = () => [['hour', tr('ساعة', 'Hour')], ['day', tr('يوم', 'Day')], ['week', tr('أسبوع', 'Week')], ['month', tr('شهر', 'Month')]];
const PF_PERIOD_VIEW = () => ({ hour: tr('بالساعة', 'Hourly'), day: tr('يومي', 'Daily'), week: tr('أسبوعي', 'Weekly'), month: tr('شهري', 'Monthly') });
const PF_AUDIENCE = () => [['all', tr('الجميع', 'Everyone')], ['students', tr('الطلاب', 'Students')]];
const PRICE_LIMIT = 40;
const pfPriceKey = (r) => [r.period, r.audience, r.shift || 'none', r.label ? r.label[0] : ''].join('|');
const pfShiftName = (shifts, id) => { const s = shifts.find((x) => x.id === id); return s ? tr(s.ar, s.en || s.ar) : ''; };

// The amount is written here: Packages.html loads desk-core.jsx, whose own `Money` takes other props.
function PfPricesView({ rows, shifts }) {
  const order = ['hour', 'day', 'week', 'month'];
  const sorted = rows.slice().sort((a, b) => (a.shift === 'none' ? 0 : 1) - (b.shift === 'none' ? 0 : 1) || String(a.shift).localeCompare(String(b.shift)) || order.indexOf(a.period) - order.indexOf(b.period) || (a.audience === 'all' ? 0 : 1) - (b.audience === 'all' ? 0 : 1));
  const hasSt = rows.some((r) => r.audience === 'students');
  const hasSh = rows.some((r) => r.shift && r.shift !== 'none');
  const P = PF_PERIOD_VIEW();
  return (
    <div className="rounded-lg border border-border">
      <QTable>
        <caption className="sr-only">{tr('الأسعار المعلنة', 'Published prices')}</caption>
        <QTHead><QTr>
          <QTh scope="col">{tr('الفترة', 'Period')}</QTh>
          {hasSt && <QTh scope="col">{tr('لمن', 'For')}</QTh>}
          {hasSh && <QTh scope="col">{tr('الوردية', 'Shift')}</QTh>}
          <QTh scope="col">{tr('السعر', 'Price')}</QTh>
        </QTr></QTHead>
        <QTBody>
          {sorted.map((r) => (
            <QTr key={r.id}>
              <QTd>{r.label ? tr(r.label[0], r.label[1] || r.label[0]) : P[r.period]}</QTd>
              {hasSt && <QTd>{r.audience === 'students' ? tr('للطلاب', 'Students') : <span className="text-muted-foreground">{tr('للجميع', 'Everyone')}</span>}</QTd>}
              {hasSh && <QTd>{r.shift && r.shift !== 'none' ? pfShiftName(shifts, r.shift) : <span className="text-muted-foreground">—</span>}</QTd>}
              <QTd className="text-label"><Ltr>{LANG === 'en' ? '₪' + r.amount : r.amount + ' ₪'}</Ltr></QTd>
            </QTr>
          ))}
        </QTBody>
      </QTable>
    </div>
  );
}

// R7: the next row takes the first period not yet priced for everyone, then the students'.
function pfNextRow(rows) {
  const ps = PF_PERIODS().map(([p]) => p);
  const free = (aud) => ps.find((p) => !rows.some((r) => r.audience === aud && (r.shift || 'none') === 'none' && r.period === p && !r.label));
  const all = free('all');
  const st = all ? null : free('students');
  return { id: 'n' + Math.random().toString(36).slice(2, 8), period: all || st || 'day', audience: all ? 'all' : st ? 'students' : 'all', shift: 'none', amount: '' };
}
// R9: an empty amount, and a repeat — the same period, audience and shift — said on its own row.
function pfPriceErrors(rows) {
  const out = {};
  const seen = new Set();
  rows.forEach((r) => {
    if (String(r.amount).trim() === '') out[r.id] = tr('أدخل المبلغ', 'Enter the amount');
    else if (!(Number(r.amount) > 0)) out[r.id] = tr('مبلغ غير صحيح', 'Not a valid amount');
    const k = pfPriceKey(r);
    if (seen.has(k)) out[r.id] = tr('هذا السعر مضاف من قبل', 'This price is already added');
    seen.add(k);
  });
  return out;
}

function PfPricesSheet({ open, d, onClose, onSave, onAddShift }) {
  const shifts = d.shifts;
  const start = d.prices.length ? d.prices : [pfNextRow([])];
  const dr = usePfDraft(open, { rows: start });
  const wide = useIsTablet();
  const rows = dr.v.rows;
  const errors = dr.tried ? pfPriceErrors(rows) : {};
  const setRow = (id, p) => dr.setV((x) => ({ rows: x.rows.map((r) => (r.id === id ? Object.assign({}, r, p) : r)) }));
  const shiftOpts = [['none', tr('بدون وردية', 'No shift')]].concat(shifts.map((s) => [s.id, tr(s.ar, s.en || s.ar)]));
  const withShift = shifts.length > 0;
  const add = () => { dr.setV((x) => ({ rows: x.rows.concat([pfNextRow(x.rows)]) })); setTimeout(() => { const all = document.querySelectorAll('[data-price-row]'); const last = all[all.length - 1]; const f = last && last.querySelector('button, input'); if (f) f.focus(); }); };
  const save = (commit) => {
    if (!commit) { dr.setTried(true); return !Object.keys(pfPriceErrors(rows)).length; }
    onSave(rows.map((r) => Object.assign({}, r, { amount: String(Number(r.amount)) })));
    return true;
  };
  const cls = 'pf-price-row ' + (withShift ? 'pf-with-shift' : '');
  return (
    <PfSheet open={open} title={tr('تعديل الأسعار المعلنة', 'Edit the published prices')} description={tr('تظهر في صفحة مساحتك وفي الدليل · للعرض فقط · الدفع في المساحة', 'Shown on your space’s page and in the directory · display only · paid at the space')} dirty={dr.dirty} onSave={save} onClose={onClose}>
      {(close) => <>
        <p className="text-body-sm text-muted-foreground">{tr('كل صف سعر واحد. أضف فقط ما تقدّمه.', 'Each row is one price. Add only what you offer.')}</p>
        {wide && <div className={cls + ' pf-price-head text-caption text-muted-foreground'} aria-hidden="true"><span>{tr('الفترة', 'Period')}</span><span>{tr('لمن', 'For')}</span>{withShift && <span>{tr('الوردية', 'Shift')}</span>}<span>{tr('المبلغ (₪)', 'Amount (₪)')}</span><span /></div>}
        <ul className="flex flex-col gap-3">
          {rows.map((r, i) => {
            const n = tr(' — السعر ', ' — price ') + (i + 1);
            return (
              <li key={r.id} data-price-row="" className="flex flex-col gap-1">
                <div className={cls + ' pf-row-block'}>
                  {r.label ? <div className="flex flex-col gap-1.5"><span className={wide ? 'sr-only' : 'text-label'}>{tr('الفترة', 'Period')}</span><span className="text-body-sm">{tr(r.label[0], r.label[1] || r.label[0])} <QBadge variant="neutral">{PF_PERIOD_VIEW()[r.period]}</QBadge></span></div>
                    : <PfPick label={tr('الفترة', 'Period') + (wide ? n : '')} srOnly={wide} value={r.period} onChange={(v) => setRow(r.id, { period: v })} options={PF_PERIODS()} />}
                  <PfPick label={tr('لمن', 'For') + (wide ? n : '')} srOnly={wide} value={r.audience} onChange={(v) => setRow(r.id, { audience: v })} options={PF_AUDIENCE()} />
                  {withShift && <div className="pf-cell-shift"><PfPick label={tr('الوردية', 'Shift') + (wide ? n : '')} srOnly={wide} value={r.shift || 'none'} onChange={(v) => setRow(r.id, { shift: v })} options={shiftOpts} /></div>}
                  <QField label={wide ? <span className="sr-only">{tr('المبلغ بالشيكل', 'Amount in shekels') + n}</span> : tr('المبلغ (₪)', 'Amount (₪)')} error={errors[r.id]}>
                    <QInput inputMode="decimal" dir="ltr" value={r.amount} onChange={(e) => setRow(r.id, { amount: latinDigits(e.target.value).replace(/[^\d.]/g, '') })} />
                  </QField>
                  <PfRemove label={tr('حذف السعر ', 'Remove price ') + (i + 1)} onClick={() => dr.setV((x) => ({ rows: x.rows.filter((y) => y.id !== r.id) }))} />
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <QButton type="button" variant="outline" disabled={rows.length >= PRICE_LIMIT} onClick={add}>{tr('إضافة سعر', 'Add a price')}</QButton>
          {rows.length >= PRICE_LIMIT && <LimitNote>{tr('الحد 40 سعرًا', 'Up to 40 prices')}</LimitNote>}
        </div>
        {!withShift && <p className="text-body-sm text-muted-foreground">{tr('تريد سعرًا لفترة من اليوم؟ ', 'Want a price for part of the day? ')}<a href="#shifts" onClick={(e) => { e.preventDefault(); close(onAddShift); }}>{tr('أضف وردية', 'Add a shift')}</a></p>}
        {rows.length === 0 && <p className="text-body-sm text-muted-foreground">{tr('لا أسعار. احفظ هكذا ليقول الدليل إن الأسعار غير متوفرة.', 'No prices. Save like this and the directory says prices aren’t available.')}</p>}
      </>}
    </PfSheet>
  );
}

function PfPricesSection({ d, api, readOnly, notice, sheet, setSheet, owner }) {
  return (
    <>
      <PfSection id="prices" title={tr('الأسعار المعلنة', 'Published prices')} d={d} api={api} readOnly={readOnly} notice={notice} onEdit={() => setSheet('prices')}
        empty={{ text: tr('لم تُضف أسعار بعد.', 'No prices yet.'), action: tr('إضافة سعر', 'Add a price'), onAction: () => setSheet('prices') }}>
        <PfPricesView rows={d.prices} shifts={d.shifts} />
        <p className="text-caption text-muted-foreground">{tr('للعرض فقط · الدفع في المساحة.', 'Display only · paid at the space.')}{owner ? tr(' تظهر في «الباقات والأسعار» للقراءة.', ' Packages & prices shows them read-only.') : ''}</p>
      </PfSection>
      {!readOnly && <PfPricesSheet open={sheet === 'prices'} d={d} onClose={() => setSheet(null)} onSave={(rows) => api.save('prices', rows)} onAddShift={() => { setSheet('shifts'); }} />}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// ساعات العمل (W1–W5): the majority first — one line Saturday to Thursday, Friday apart.
// ---------------------------------------------------------------------------------------------
const PF_WEEK = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'];
const pfTodayKey = () => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
const pfSame = (a, b) => (a && b ? a[0] === b[0] && a[1] === b[1] : a === b);
function pfHourGroups(hours) {
  const groups = [];
  DAYS().forEach(([k, n]) => {
    const last = groups[groups.length - 1];
    if (last && pfSame(last.range, hours[k])) { last.keys.push(k); last.names.push(n); }
    else groups.push({ keys: [k], names: [n], range: hours[k] });
  });
  return groups;
}
// Hours that the simple view can hold: Saturday to Thursday open with one range (W4).
const pfUniform = (h) => PF_WEEK.every((k) => h[k] && pfSame(h[k], h.sat));

function PfHoursView({ hours, closureHref }) {
  const t = pfTodayKey();
  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col divide-y rounded-lg border border-border">
        {pfHourGroups(hours).map((g) => {
          const today = g.keys.includes(t);
          const label = g.names.length > 2 ? g.names[0] + ' – ' + g.names[g.names.length - 1] : g.names.join(tr('، ', ', '));
          return (
            <div key={g.keys.join()} className={'flex flex-wrap items-center justify-between gap-2 px-3 py-2 ' + (today ? 'bg-accent' : '')}>
              <dt className="flex items-center gap-2 text-body">{label}{today && <QBadge variant="primary">{tr('اليوم', 'Today')}</QBadge>}</dt>
              <dd className="text-body">{g.range ? <Ltr>{g.range[0]}–{g.range[1]}</Ltr> : <span className="text-muted-foreground">{tr('مغلقة', 'Closed')}</span>}</dd>
            </div>
          );
        })}
      </dl>
      {closureHref && <p className="text-body-sm text-muted-foreground">{tr('إغلاق مؤقت؟ ', 'Closing for a while? ')}<a href={closureHref}>{tr('أضف إعلان إغلاق', 'Add a closure announcement')}</a></p>}
    </div>
  );
}

// The Sheet's draft: the simple view's two ranges, or the seven days.
function pfHoursDraft(hours) {
  const h = hours || { sat: ['08:00', '18:00'], sun: ['08:00', '18:00'], mon: ['08:00', '18:00'], tue: ['08:00', '18:00'], wed: ['08:00', '18:00'], thu: ['08:00', '18:00'], fri: null };
  const main = h.sat || PF_WEEK.map((k) => h[k]).find(Boolean) || ['08:00', '18:00'];
  return { custom: !pfUniform(h), main: main.slice(), friOpen: !!h.fri, fri: (h.fri || main).slice(), days: Object.fromEntries(DAYS().map(([k]) => [k, { open: !!h[k], from: (h[k] || main)[0], to: (h[k] || main)[1] }])) };
}
function pfHoursOf(v) {
  if (!v.custom) return Object.assign(Object.fromEntries(PF_WEEK.map((k) => [k, v.main.slice()])), { fri: v.friOpen ? v.fri.slice() : null });
  return Object.fromEntries(DAYS().map(([k]) => [k, v.days[k].open ? [v.days[k].from, v.days[k].to] : null]));
}
const pfAfter = (r) => (toMin(r[1]) > toMin(r[0]) ? null : tr('«إلى» بعد «من»', '“To” comes after “From”'));

function PfHoursSheet({ open, d, onClose, onSave }) {
  const [v, setV] = React.useState(() => pfHoursDraft(d.hours));
  const [tried, setTried] = React.useState(false);
  const [unify, setUnify] = React.useState(false);
  const [base, setBase] = React.useState('');
  const last = React.useRef(null);
  // `dirty` compares with the hours as the Sheet opened them: a space without hours opens on the
  // default week, which is not yet a change.
  React.useEffect(() => { if (open) { const x = pfHoursDraft(d.hours); setV(x); setBase(JSON.stringify(pfHoursOf(x))); setTried(false); last.current = null; } }, [open]);
  const set = (p) => setV((x) => Object.assign({}, x, p));
  const setDay = (k, p) => { if (p.from || p.to) last.current = k; setV((x) => Object.assign({}, x, { days: Object.assign({}, x.days, { [k]: Object.assign({}, x.days[k], p) }) })); };
  // W5: a day switched on takes the hours of the last open day edited.
  const turnOn = (k, on) => {
    if (!on) { setDay(k, { open: false }); return; }
    const src = last.current && v.days[last.current].open ? v.days[last.current] : DAYS().map(([x]) => v.days[x]).filter((x) => x.open).pop() || { from: v.main[0], to: v.main[1] };
    setDay(k, { open: true, from: src.from, to: src.to });
  };
  const toCustom = () => { const h = pfHoursOf(v); set({ custom: true, days: Object.fromEntries(DAYS().map(([k]) => [k, { open: !!h[k], from: (h[k] || v.main)[0], to: (h[k] || v.main)[1] }])) }); };
  const toSimple = () => {
    const firstOpen = PF_WEEK.map((k) => v.days[k]).find((x) => x.open) || { from: v.main[0], to: v.main[1] };
    set({ custom: false, main: [firstOpen.from, firstOpen.to], friOpen: v.days.fri.open, fri: [v.days.fri.from, v.days.fri.to] });
  };
  const askSimple = () => { const h = pfHoursOf(v); if (pfUniform(h)) toSimple(); else setUnify(true); };
  const errs = () => {
    const out = {};
    if (!v.custom) { if (pfAfter(v.main)) out.main = pfAfter(v.main); if (v.friOpen && pfAfter(v.fri)) out.fri = pfAfter(v.fri); }
    else { DAYS().forEach(([k]) => { const x = v.days[k]; if (x.open && pfAfter([x.from, x.to])) out[k] = pfAfter([x.from, x.to]); }); if (!DAYS().some(([k]) => v.days[k].open)) out.none = tr('افتح يومًا واحدًا على الأقل.', 'Open at least one day.'); }
    return out;
  };
  const e = tried ? errs() : {};
  const save = (commit) => { if (!commit) { setTried(true); return !Object.keys(errs()).length; } onSave(pfHoursOf(v)); return true; };
  const dirty = open && JSON.stringify(pfHoursOf(v)) !== base;
  return (
    <PfSheet open={open} title={tr('تعديل ساعات العمل', 'Edit the opening hours')} description={tr('تحدّد «مفتوحة الآن» في الدليل.', 'They decide “Open now” in the directory.')} dirty={dirty} onSave={save} onClose={onClose}>
      {!v.custom ? <>
        <fieldset className="flex flex-col gap-3">
          <legend className="pb-2 text-label">{tr('من السبت إلى الخميس', 'Saturday to Thursday')}</legend>
          <div className="grid grid-cols-2 gap-3">
            <PfTime label={tr('من', 'From')} value={v.main[0]} onChange={(t) => set({ main: [t, v.main[1]] })} />
            <PfTime end label={tr('إلى', 'To')} value={v.main[1]} onChange={(t) => set({ main: [v.main[0], t] })} error={e.main} />
          </div>
        </fieldset>
        <div className="flex flex-col gap-3">
          <QField label={tr('مفتوحة يوم الجمعة أيضًا', 'Also open on Friday')} orientation="horizontal"><QCheckbox checked={v.friOpen} onCheckedChange={(on) => set({ friOpen: !!on, fri: on ? (v.friOpen ? v.fri : v.main.slice()) : v.fri })} /></QField>
          {v.friOpen
            ? <fieldset className="pf-indent grid grid-cols-2 gap-3"><legend className="sr-only">{tr('الجمعة', 'Friday')}</legend>
                <PfTime label={tr('الجمعة من', 'Friday from')} value={v.fri[0]} onChange={(t) => set({ fri: [t, v.fri[1]] })} />
                <PfTime end label={tr('إلى', 'To')} value={v.fri[1]} onChange={(t) => set({ fri: [v.fri[0], t] })} error={e.fri} />
              </fieldset>
            : <p className="pf-indent text-body-sm text-muted-foreground">{tr('الجمعة: إجازة', 'Friday: closed')}</p>}
        </div>
        <div><QButton type="button" variant="outline" onClick={toCustom}>{tr('تخصيص الأيام', 'Set each day')}</QButton></div>
      </> : <>
        <p className="text-body-sm text-muted-foreground">{tr('لكل يوم ساعاته، أو اجعله إجازة.', 'Each day its own hours, or closed.')}</p>
        {e.none && <p className="text-body-sm text-destructive" role="alert">{e.none}</p>}
        <ul className="flex flex-col gap-2">
          {DAYS().map(([k, n]) => {
            const x = v.days[k];
            return (
              <li key={k}>
                <fieldset className="pf-day-row rounded-lg border border-border p-3">
                <legend className="sr-only">{n}</legend>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-label" aria-hidden="true">{n}</span>
                  <span className="flex items-center gap-2"><span className="text-body-sm text-muted-foreground" aria-hidden="true">{x.open ? tr('مفتوحة', 'Open') : tr('إجازة', 'Closed')}</span><QSwitch checked={x.open} onCheckedChange={(on) => turnOn(k, on)} aria-label={tr('مفتوحة يوم ', 'Open on ') + n} /></span>
                </div>
                {x.open && <div className="grid grid-cols-2 gap-3">
                  <PfTime label={tr('من', 'From')} srOnly={false} value={x.from} onChange={(t) => setDay(k, { from: t })} />
                  <PfTime end label={tr('إلى', 'To')} value={x.to} onChange={(t) => setDay(k, { to: t })} error={e[k]} />
                </div>}
                </fieldset>
              </li>
            );
          })}
        </ul>
        <div><QButton type="button" variant="ghost" onClick={askSimple}>{tr('رجوع إلى الشكل البسيط', 'Back to the simple view')}</QButton></div>
      </>}
      <QAlert open={unify} onOpenChange={setUnify}>
        <QAlertContent>
          <QAlertHeader>
            <QAlertTitle>{tr('سيتم توحيد الساعات لكل الأيام. متابعة؟', 'Every day will take the same hours. Continue?')}</QAlertTitle>
            <QAlertDescription>{tr('تأخذ أيام السبت إلى الخميس ساعات أول يوم مفتوح منها، وتبقى الجمعة كما هي.', 'Saturday to Thursday take the hours of the first of them that’s open; Friday stays as it is.')}</QAlertDescription>
          </QAlertHeader>
          <QAlertFooter>
            <QAlertCancel>{tr('رجوع', 'Back')}</QAlertCancel>
            <QAlertAction onClick={() => { setUnify(false); toSimple(); }}>{tr('متابعة', 'Continue')}</QAlertAction>
          </QAlertFooter>
        </QAlertContent>
      </QAlert>
    </PfSheet>
  );
}

function PfHoursSection({ d, api, readOnly, notice, sheet, setSheet, closureHref }) {
  return (
    <>
      <PfSection id="hours" title={tr('ساعات العمل', 'Opening hours')} d={d} api={api} readOnly={readOnly} notice={notice} onEdit={() => setSheet('hours')}
        empty={{ text: tr('ساعات العمل غير متوفرة.', 'Opening hours aren’t available.'), hint: tr('بدونها لا يعرف الزوار إن كانت المساحة مفتوحة الآن.', 'Without them, visitors can’t tell whether the space is open now.'), action: tr('أضف ساعات العمل', 'Add the opening hours'), onAction: () => setSheet('hours') }}>
        {d.hours && <PfHoursView hours={d.hours} closureHref={readOnly ? null : closureHref} />}
      </PfSection>
      {!readOnly && <PfHoursSheet open={sheet === 'hours'} d={d} onClose={() => setSheet(null)} onSave={(h) => api.save('hours', h)} />}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// الورديات (S1–S5): a section of its own, after the hours; one name per shift (S3).
// ---------------------------------------------------------------------------------------------
const pfDaysOf = (hours) => Object.fromEntries(DAYS().map(([k]) => [k, hours && hours[k] ? { open: true, from: hours[k][0], to: hours[k][1] } : { open: false, from: '00:00', to: '00:00' }]));
const pfShiftLine = (shifts) => shifts.map((s, i) => <React.Fragment key={s.id}>{i > 0 && <span className="text-muted-foreground"> · </span>}<span>{tr(s.ar, s.en || s.ar)} <Ltr>{s.from}–{s.to}</Ltr></span></React.Fragment>);

function PfShiftsSheet({ open, d, used, onClose, onSave }) {
  const start = d.shifts.length ? d.shifts : [{ id: null, key: 'k0', ar: '', en: '', from: '08:00', to: '13:00' }];
  const dr = usePfDraft(open, { list: start.map((s, i) => Object.assign({ key: s.id || 'k' + i }, s)) });
  const list = dr.v.list;
  const days = pfDaysOf(d.hours);
  const errs = () => {
    const out = {};
    list.forEach((s, i) => {
      if (!s.ar.trim()) out[s.key + '-name'] = tr('اكتب اسم الوردية', 'Enter the shift’s name');
      else if (list.findIndex((y) => y.ar.trim() === s.ar.trim()) < i) out[s.key + '-name'] = tr('اسم وردية مكرّر', 'A repeated shift name');
      const c = shiftCheck(s, days);
      if (c.error) out[s.key + '-to'] = c.error;
    });
    return out;
  };
  const e = dr.tried ? errs() : {};
  const setS = (key, p) => dr.setV((x) => ({ list: x.list.map((s) => (s.key === key ? Object.assign({}, s, p) : s)) }));
  const save = (commit) => {
    if (!commit) { dr.setTried(true); return !Object.keys(errs()).length; }
    onSave(list.map((s) => ({ id: s.id || 'n' + Math.random().toString(36).slice(2, 7), ar: s.ar.trim(), en: s.en || '', from: s.from, to: s.to })));
    return true;
  };
  return (
    <PfSheet open={open} title={tr('تعديل الورديات', 'Edit the shifts')} description={tr('اختيارية: للأسعار والباقات التي تخصّ فترة من اليوم.', 'Optional: for prices and packages that cover part of the day.')} dirty={dr.dirty} onSave={save} onClose={onClose}>
      <p className="text-body-sm text-muted-foreground">{tr('كل وردية ضمن ساعات يوم مفتوح واحد على الأقل.', 'Each shift lies inside the hours of at least one open day.')}</p>
      <ul className="flex flex-col gap-3">
        {list.map((s, i) => {
          const c = shiftCheck(s, days);
          const inUse = !!s.id && used.includes(s.id);
          return (
            <li key={s.key} className="pf-shift-row rounded-lg border border-border p-3">
              <QField label={tr('اسم الوردية', 'Shift name')} error={e[s.key + '-name']}><QInput lang="ar" dir="auto" placeholder={tr('مثلًا: المسائية', 'e.g. Evening')} value={s.ar} onChange={(ev) => setS(s.key, { ar: ev.target.value })} /></QField>
              <PfTime label={tr('من', 'From')} value={s.from} onChange={(t) => setS(s.key, { from: t })} />
              <QField label={tr('إلى', 'To')} error={e[s.key + '-to']} helper={!e[s.key + '-to'] ? c.helper : undefined}>
                <QSelect value={s.to} onValueChange={(t) => setS(s.key, { to: t })}><QTrigger className="w-full" dir="ltr"><QValue /></QTrigger><QContent>{PF_ENDS.map((t) => <QItem key={t} value={t}><Ltr>{t}</Ltr></QItem>)}</QContent></QSelect>
              </QField>
              <PfRemove label={tr('حذف الوردية ', 'Remove shift ') + (i + 1)} disabled={inUse} onClick={() => dr.setV((x) => ({ list: x.list.filter((y) => y.key !== s.key) }))} />
              {inUse && <p className="pf-row-note text-caption text-muted-foreground">{tr('هذه الوردية مستخدمة في سعر أو باقة، أزلها منها أولًا.', 'A price or a package uses this shift; take it off there first.')}</p>}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <QButton type="button" variant="outline" disabled={list.length >= SHIFT_LIMIT} onClick={() => dr.setV((x) => ({ list: x.list.concat([{ id: null, key: 'k' + Date.now(), ar: '', en: '', from: '13:00', to: '18:00' }]) }))}>{tr('إضافة وردية', 'Add a shift')}</QButton>
        {list.length >= SHIFT_LIMIT && <LimitNote>{tr('الحد 10 ورديات', 'Up to 10 shifts')}</LimitNote>}
      </div>
    </PfSheet>
  );
}

function PfShiftsSection({ d, api, readOnly, sheet, setSheet, used }) {
  return (
    <>
      <PfSection id="shifts" title={tr('الورديات', 'Shifts')} d={d} api={api} readOnly={readOnly} onEdit={() => setSheet('shifts')}
        empty={{ text: tr('لا توجد ورديات.', 'No shifts.'), hint: tr('الورديات اختيارية، تحتاجها إذا كانت لديك أسعار أو باقات لفترات محددة من اليوم.', 'Shifts are optional: you need them for prices or packages that cover part of the day.'), action: tr('إضافة وردية', 'Add a shift'), onAction: () => setSheet('shifts'), primary: false }}>
        <p className="text-body">{pfShiftLine(d.shifts)}</p>
      </PfSection>
      {!readOnly && <PfShiftsSheet open={sheet === 'shifts'} d={d} used={used} onClose={() => setSheet(null)} onSave={(l) => api.save('shifts', l)} />}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// المرافق (A1–A2): only what the space offers, as the public page shows it.
// ---------------------------------------------------------------------------------------------
const OWN_LIMIT = 20;
const OWN_MAX = 60;
// The catalogue as the admin's lookups hold it (with each icon key); the owner's pages read the
// public one, whose icons follow the same ids.
const PF_AMENITY_ICON = { internet: 'wifi', power: 'zap', solar: 'sun', generator: 'plug-zap', drinks: 'coffee', meeting: 'users', rental: 'presentation', training: 'graduation-cap' };
const pfCatalogue = () => window.MASAHA.allAmenities.map((a) => ({ id: a.id, name: a.name, icon: PF_AMENITY_ICON[a.id] || 'check' }));

function PfAmenitiesView({ v, retired }) {
  const cat = pfCatalogue().concat(retired || []);
  const items = cat.filter((a) => v.list.includes(a.id)).map((a) => ({ key: a.id, name: a.name, icon: a.icon }))
    .concat(v.own.map((o) => ({ key: 'own:' + o.ar, name: LANG === 'en' && o.en ? o.en : o.ar, lang: LANG === 'en' && !o.en ? 'ar' : undefined, icon: 'check' })));
  return (
    <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {items.map((a) => <li key={a.key} className="flex min-w-0 items-center gap-2 rounded-lg bg-muted px-3 py-2 text-body-sm"><PfIcon name={a.icon} /><span className="min-w-0" lang={a.lang} dir={a.lang ? 'rtl' : undefined}>{a.name}</span></li>)}
    </ul>
  );
}

function PfAmenitiesSheet({ open, d, retired, onClose, onSave, manage }) {
  const dr = usePfDraft(open, { list: d.amenities.list.slice(), own: d.amenities.own.map((o, i) => Object.assign({ id: 'm' + i }, o)) });
  const v = dr.v;
  const cat = pfCatalogue();
  // A retired amenity the space still holds stays listed and marked until it is unticked and saved.
  const held = (retired || []).filter((a) => d.amenities.list.includes(a.id));
  const names = cat.map((a) => a.name);
  const AD = window.ADMIN;
  const both = AD ? AD.lookups.amenities.flatMap((a) => [a.ar, a.en.toLowerCase()]) : [];
  const inCatalogue = (s) => { const t = s.trim(); return t && (names.includes(t) || both.includes(t) || both.includes(t.toLowerCase())); };
  const errs = () => {
    const out = {}; const seen = new Set();
    v.own.forEach((o) => {
      const ar = o.ar.trim();
      if (!ar) out[o.id + '-ar'] = tr('اكتب اسم المرفق بالعربية أو احذف هذا الصف', 'Enter the Arabic name, or remove this row');
      else if (inCatalogue(ar) || inCatalogue(o.en)) out[o.id + '-ar'] = tr('هذا المرفق موجود في القائمة، اختره من فوق', 'This amenity is in the list: tick it above');
      else if (ar.length > OWN_MAX) out[o.id + '-ar'] = tr('60 حرفًا على الأكثر', '60 characters at most');
      else if (seen.has(ar)) out[o.id + '-ar'] = tr('مرفق مكرّر', 'A repeated amenity');
      if (o.en.trim().length > OWN_MAX) out[o.id + '-en'] = tr('60 حرفًا على الأكثر', '60 characters at most');
      if (ar) seen.add(ar);
    });
    return out;
  };
  const e = dr.tried ? errs() : {};
  const toggle = (id, on) => dr.setV((x) => Object.assign({}, x, { list: on ? x.list.concat([id]) : x.list.filter((y) => y !== id) }));
  const setO = (id, p) => dr.setV((x) => Object.assign({}, x, { own: x.own.map((o) => (o.id === id ? Object.assign({}, o, p) : o)) }));
  const save = (commit) => { if (!commit) { dr.setTried(true); return !Object.keys(errs()).length; } onSave({ list: v.list.slice(), own: v.own.map((o) => ({ ar: o.ar.trim(), en: o.en.trim() })) }); return true; };
  const row = (a, mark) => (
    <QField key={a.id} className="pf-check rounded-lg px-2" orientation="horizontal"
      label={<span className="flex items-center gap-2"><PfIcon name={a.icon} />{a.name}{mark}</span>}
      helper={mark ? tr('لم يعد في قائمة المنصة. أزل العلامة لحذفه من مساحتك.', 'No longer in the platform’s list. Untick it to remove it from your space.') : undefined}>
      <QCheckbox checked={v.list.includes(a.id)} onCheckedChange={(on) => toggle(a.id, !!on)} />
    </QField>
  );
  return (
    <PfSheet open={open} title={tr('تعديل المرافق', 'Edit the amenities')} dirty={dr.dirty} onSave={save} onClose={onClose}>
      {(close) => <>
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-label">{tr('ما تقدّمه المساحة', 'What the space offers')}</legend>
        <div className="grid gap-1 md:grid-cols-2">
          {cat.map((a) => row(a))}
          {held.map((a) => row(a, <QBadge variant="warning">{tr('أُزيل من القائمة', 'Retired')}</QBadge>))}
        </div>
        {manage && <p className="text-body-sm text-muted-foreground">{tr('لإضافة مرفق إلى قائمة كل المساحات: ', 'To add an amenity to every space’s list: ')}<a href={manage} onClick={(ev) => { ev.preventDefault(); close(() => { location.href = carryParams(manage); }); }}>{tr('إدارة قائمة المرافق', 'Manage the amenities list')}</a></p>}
      </fieldset>
      <section aria-labelledby="pf-own-title" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="pf-own-title" className="text-label">{tr('مرافق أخرى', 'Other amenities')}</h3>
          <p className="text-body-sm text-muted-foreground">{tr('ما تقدّمه مساحتك وليس في القائمة.', 'What your space offers that the list doesn’t have.')}</p>
        </div>
        {v.own.length > 0 && <ul className="flex flex-col gap-3">
          {v.own.map((o, i) => (
            <li key={o.id} className="pf-own-row">
              <QField label={tr('الاسم بالعربية', 'Name in Arabic')} error={e[o.id + '-ar']}><QInput lang="ar" dir="rtl" value={o.ar} onChange={(ev) => setO(o.id, { ar: ev.target.value })} /></QField>
              <QField label={tr('الاسم بالإنجليزية', 'Name in English')} labelEnd={<Optional />} error={e[o.id + '-en']}><QInput lang="en" dir="ltr" value={o.en} onChange={(ev) => setO(o.id, { en: ev.target.value })} /></QField>
              <PfRemove label={tr('حذف المرفق ', 'Remove amenity ') + (i + 1)} onClick={() => dr.setV((x) => Object.assign({}, x, { own: x.own.filter((y) => y.id !== o.id) }))} />
            </li>
          ))}
        </ul>}
        <div className="flex flex-wrap items-center gap-3">
          <QButton type="button" variant="outline" disabled={v.own.length >= OWN_LIMIT} onClick={() => dr.setV((x) => Object.assign({}, x, { own: x.own.concat([{ id: 'n' + Date.now(), ar: '', en: '' }]) }))}>{tr('إضافة مرفق آخر', 'Add another amenity')}</QButton>
          {v.own.length >= OWN_LIMIT && <LimitNote>{tr('الحد 20 مرفقًا', 'Up to 20 amenities')}</LimitNote>}
        </div>
      </section>
      </>}
    </PfSheet>
  );
}

function PfAmenitiesSection({ d, api, readOnly, notice, sheet, setSheet, retired, manage }) {
  return (
    <>
      <PfSection id="amenities" title={tr('المرافق', 'Amenities')} d={d} api={api} readOnly={readOnly} notice={notice} onEdit={() => setSheet('amenities')}
        empty={{ text: tr('لم تُضف مرافق بعد.', 'No amenities yet.'), action: tr('أضف المرافق', 'Add the amenities'), onAction: () => setSheet('amenities') }}>
        <PfAmenitiesView v={d.amenities} retired={retired} />
      </PfSection>
      {!readOnly && <PfAmenitiesSheet open={sheet === 'amenities'} d={d} retired={retired} manage={manage} onClose={() => setSheet(null)} onSave={(a) => api.save('amenities', a)} />}
    </>
  );
}

Object.assign(window, { PfIcon, PF_ICON_PATHS, PF_TIMES, PF_ENDS, PfTime, PfPick, PfRemove, PF_PERIODS, PF_AUDIENCE, PfPricesView, PfPricesSection, PfHoursView, PfHoursSection, PfShiftsSection, PfAmenitiesSection, pfShiftLine, pfUniform, pfCatalogue, PF_AMENITY_ICON });
