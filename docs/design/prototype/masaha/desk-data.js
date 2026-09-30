// Front-desk demo data for Focus Hub (private dashboard view). Invented customers, placeholder phones.
// Demo clock: Tuesday 2026-09-29, 12:40. Week starts Saturday.
window.DESK = (function () {
  const T = window.tr;
  const TODAY = '2026-09-29', NOW = '12:40', TODAY_KEY = 'tue', CLOSE = '18:00';
  const PRICES = { hour: 3, day: 15, week: 90, month: 300, studentMonth: 250 };
  // Demo: ?prices=dayonly (no hour price) or ?prices=none (no hour and no day price).
  const PM = new URLSearchParams(location.search).get('prices');
  if (PM === 'dayonly' || PM === 'none') PRICES.hour = null;
  if (PM === 'none') PRICES.day = null;
  const WEEKDAYS = [['sat', T('السبت', 'Sat')], ['sun', T('الأحد', 'Sun')], ['mon', T('الاثنين', 'Mon')], ['tue', T('الثلاثاء', 'Tue')], ['wed', T('الأربعاء', 'Wed')], ['thu', T('الخميس', 'Thu')], ['fri', T('الجمعة', 'Fri')]];
  const SHIFTS = { am: T('الوردية الصباحية', 'Morning shift'), pm: T('الوردية المسائية', 'Evening shift') };
  const PACKAGES = [
    { id: 'month', name: T('شهري', 'Monthly'), kind: 'month', days: 30, amount: 300, isPublic: true, terms: T('30 يومًا · كل أيام العمل', '30 days · every open day') },
    { id: 'month-st', name: T('شهري طلاب', 'Student month'), kind: 'month', days: 30, amount: 250, isPublic: true, student: true, terms: T('30 يومًا · للطلاب', '30 days · students') },
    { id: 'week', name: T('أسبوعي', 'Weekly'), kind: 'week', days: 7, amount: 90, isPublic: true, terms: T('7 أيام', '7 days') },
    { id: '10days', name: T('10 أيام', '10 days'), kind: 'package', days: 45, amount: 130, totalDays: 10, terms: T('10 أيام خلال 45 يومًا', '10 days within 45 days') },
    { id: '20h', name: T('20 ساعة', '20 hours'), kind: 'package', days: 30, amount: 50, hourBalance: 20, terms: T('رصيد 20 ساعة خلال 30 يومًا', '20-hour balance within 30 days') },
    { id: 'alt', name: T('شهر يوم بعد يوم', 'Month, every other day'), kind: 'package', days: 30, amount: 180, daysPerWeek: 3, terms: T('3 أيام بالأسبوع لمدة شهر', '3 days a week for a month') }
  ];
  const pkg = (id) => PACKAGES.find((p) => p.id === id);

  // sub: from/to, pkg id or 'custom', terms, used, billing, pays [[date, time, amount, method, by, voidReason?]]
  const S = (id, p, from, to, extra = {}) => {
    const P = pkg(p);
    return { id, pkg: p, name: P ? P.name : T('مخصّص', 'Custom'), from, to, terms: P ? { totalDays: P.totalDays, daysPerWeek: P.daysPerWeek, hourBalance: P.hourBalance } : {}, used: {}, billing: { type: 'fixed', amount: P ? P.amount : 0 }, pays: [], ...extra };
  };
  const A = 'أحمد', SM = 'سامي';
  const by = (n) => (n === A ? T('أحمد', 'Ahmad') : T('سامي', 'Sami'));
  const customers = [
    { id: 'm1', name: T('محمد العطار', 'Mohammed Al-Attar'), phone: '+970 59 000 1001', subs: [
      S('s1c', 'month', '2026-09-21', '2026-10-20', { pays: [['2026-09-21', '08:10', 300, 'transfer', A]] }),
      S('s1b', 'month', '2026-08-21', '2026-09-20', { pays: [['2026-08-21', '08:30', 300, 'cash', A]] }),
      S('s1a', 'week', '2026-08-14', '2026-08-20', { pays: [['2026-08-14', '09:00', 90, 'cash', SM]] })] },
    { id: 'm2', name: T('ليان حمدان', 'Layan Hamdan'), phone: '+970 59 000 1002', subs: [S('s2', '10days', '2026-09-10', '2026-10-24', { used: { days: 4 }, pays: [['2026-09-10', '10:00', 130, 'cash', SM]] })] },
    { id: 'm3', name: T('يوسف أبو شعبان', 'Yousef Abu Shaaban'), phone: '+970 56 000 1003', subs: [S('s3', 'alt', '2026-09-15', '2026-10-14', { used: { week: 2 }, pays: [['2026-09-15', '09:20', 50, 'cash', A], ['2026-09-29', '12:10', 50, 'transfer', SM]] })] },
    { id: 'm4', name: T('نور الهدى سالم', 'Nour Al-Huda Salem'), phone: '+970 59 000 1004', subs: [S('s4', 'custom', '2026-09-20', '2026-10-19', { terms: { hoursPerDay: 3 }, billing: { type: 'usage', unit: 'hour', rate: 3 }, used: { hours: 21 }, note: T('تدفع كل أسبوع', 'Pays every week'), pays: [['2026-09-29', '09:15', 30, 'cash', SM]] })] },
    { id: 'm5', name: T('أحمد الشوا', 'Ahmad Al-Shawa'), phone: '+970 59 000 1005', subs: [S('s5', 'month', '2026-08-27', '2026-09-26', { pays: [['2026-08-27', '08:40', 300, 'cash', A]] })] },
    { id: 'm6', name: T('رهف قديح', 'Rahaf Qudaih'), phone: '+970 59 000 1006', student: true, subs: [S('s6', 'month-st', '2026-09-01', '2026-09-30', { debtLabel: T('اشتراك سبتمبر', 'the September membership'), pays: [['2026-09-01', '09:05', 100, 'cash', A], ['2026-09-15', '11:20', 50, 'transfer', SM, T('سُجّلت مرتين بالخطأ', 'Recorded twice by mistake'), null, A]] })] },
    { id: 'm7', name: T('خالد النجار', 'Khaled Al-Najjar'), phone: '+970 56 000 1007', subs: [S('s7', 'week', '2026-09-28', '2026-10-04', { pays: [['2026-09-28', '09:00', 90, 'cash', A]] })] },
    { id: 'm8', name: T('سلمى الريس', 'Salma Al-Rayyes'), phone: '+970 59 000 1008', subs: [S('s8', '20h', '2026-09-20', '2026-10-19', { used: { hours: 12 }, pays: [['2026-09-20', '10:30', 50, 'cash', SM]] })] },
    { id: 'm9', name: T('عمر حلس', 'Omar Hilles'), phone: '+970 59 000 1009', subs: [S('s9', 'month', '2026-09-02', '2026-10-01', { pays: [['2026-09-02', '08:15', 300, 'transfer', A]] })] },
    { id: 'm10', name: T('دانة الغول', 'Dana Al-Ghoul'), phone: '+970 59 000 1010', subs: [] },
    { id: 'm11', name: T('إبراهيم عاشور', 'Ibrahim Ashour'), phone: '+970 56 000 1011', subs: [S('s11', 'month', '2026-09-28', '2026-10-27', { billing: { type: 'fixed', amount: 280 }, manual: true, pays: [['2026-09-28', '08:20', 280, 'transfer', A]] })] },
    { id: 'm12', name: T('ميار سكيك', 'Mayar Skaik'), phone: '+970 59 000 1012', subs: [S('s12', 'custom', '2026-09-19', '2026-10-18', { name: T('3 أيام ثابتة', '3 fixed days'), terms: { weekDays: ['sat', 'mon', 'wed'] }, billing: { type: 'fixed', amount: 200 }, manual: true, shift: 'am', pays: [['2026-09-19', '08:00', 200, 'cash', A]] })] },
    { id: 'm13', name: T('بلال زقوت', 'Bilal Zaqout'), phone: '+970 59 000 1013', subs: [S('s13', 'custom', '2026-09-15', '2026-10-14', { terms: { hoursPerDay: 3 }, billing: { type: 'fixed', amount: 150 }, manual: true, used: { todayMin: 180 }, pays: [['2026-09-15', '08:30', 150, 'cash', A]] })] },
    { id: 'm14', name: T('مالك صيام', 'Malek Siam'), phone: '+970 56 000 1014', subs: [] },
    { id: 'm15', name: T('رنا الأغا', 'Rana Al-Agha'), phone: '+970 59 000 1015', subs: [S('s15', 'custom', '2026-09-14', '2026-10-13', { name: T('بالساعة — مدفوع مقدمًا', 'Hourly — prepaid'), billing: { type: 'usage', unit: 'hour', rate: 3 }, used: { hours: 14 }, pays: [['2026-09-14', '09:30', 60, 'cash', A]] })] }
  ];
  const fillers = [T('هادي النخالة', 'Hadi Al-Nakhala'), T('سارة البحيصي', 'Sara Al-Buhaisi'), T('أنس الجمل', 'Anas Al-Jamal'), T('ديما عكاشة', 'Dima Okasha'), T('طارق مقداد', 'Tareq Miqdad'), T('ياسمين الشريف', 'Yasmin Al-Sharif'), T('زياد ضاهر', 'Ziad Daher'), T('فرح أبو رمضان', 'Farah Abu Ramadan'), T('كريم دلول', 'Karim Dalloul'), T('شهد حجازي', 'Shahd Hijazi'), T('مريم الخالدي', 'Maryam Al-Khalidi'), T('حمزة السقا', 'Hamza Al-Saqqa'), T('آية المدهون', 'Aya Al-Madhoun')];
  const fEnds = ['2026-10-12', '2026-10-18', '2026-10-09', '2026-10-22', '2026-10-15', '2026-10-26', '2026-10-11', '2026-10-20', '2026-10-07', '2026-10-24', '2026-10-14', '2026-10-17', '2026-10-21'];
  fillers.forEach((n, i) => {
    const to = fEnds[i]; const d = new Date(to + 'T12:00:00'); d.setDate(d.getDate() - 29); const from = d.toISOString().slice(0, 10);
    customers.push({ id: 'f' + i, name: n, phone: '+970 59 000 2' + String(i).padStart(3, '0'), subs: [S('sf' + i, i % 4 === 3 ? 'month-st' : 'month', from, to, { pays: [[from, '08:30', i % 4 === 3 ? 250 : 300, i % 2 ? 'transfer' : 'cash', i % 3 ? SM : A]] })] });
  });

  // Present now: 19 subscribers + 8 visits = 27.
  const subPresent = [['m1', '08:05'], ['m2', '08:30'], ['m4', '10:30'], ['m7', '09:10'], ['m9', '09:40'], ['m11', '08:47']];
  const fTimes = ['07:58', '08:12', '08:20', '08:31', '08:55', '09:02', '09:18', '09:33', '09:50', '10:15', '10:44', '11:06', '11:48'];
  fTimes.forEach((t, i) => subPresent.push(['f' + i, t]));
  const visits = [[T('هبة المصري', 'Heba Al-Masri'), '08:40', true], [T('تالا شراب', 'Tala Sharab'), '09:25'], [T('روان مهنا', 'Rawan Muhanna'), '10:05', true], [T('آدم الحلو', 'Adam Al-Helou'), '10:50'], [T('جنى أبو ندى', 'Jana Abu Nada'), '11:15'], [T('ريم بكر', 'Reem Bakr'), '11:40'], [T('حسن الطويل', 'Hasan Al-Taweel'), '12:05'], [T('لمى الكرد', 'Lama Al-Kurd'), '12:20']];
  const present = [
    ...subPresent.map(([cid, since], i) => ({ id: 'ps' + i, kind: 'sub', customerId: cid, since })),
    ...visits.map(([name, since, student], i) => ({ id: 'pv' + i, kind: 'visit', name, since, student: !!student }))
  ].sort((a, b) => (a.since < b.since ? 1 : -1));

  // Unpaid visits: left without paying, or checked out automatically at closing.
  const unpaid = [
    { id: 'u1', customerId: 'm10', date: TODAY, in: '09:00', out: '11:10', amount: 9, how: 'left' },
    { id: 'u2', customerId: 'm14', date: '2026-09-28', in: '14:00', out: CLOSE, amount: 12, how: 'auto' }
  ];
  // Visits paid today (not tied to a customer): for «دفعاتي اليوم».
  const visitPays = [
    { id: 'vp1', name: T('فرح جابر', 'Farah Jaber'), date: TODAY, time: '10:02', amount: 6, method: 'cash', by: SM },
    { id: 'vp2', name: T('أنس البنا', 'Anas Al-Banna'), date: TODAY, time: '10:40', amount: 9, method: 'transfer', by: SM },
    { id: 'vp3', name: T('شهد عيّاد', 'Shahd Ayyad'), date: TODAY, time: '11:55', amount: 15, method: 'cash', by: SM }
  ];

  const olderVisits = [['2026-09-28', '17:20', 12, 'cash', SM, T('يزن حمّاد', 'Yazan Hammad')], ['2026-09-28', '13:05', 15, 'cash', A, T('نادين سرور', 'Nadine Srour')], ['2026-09-27', '16:40', 9, 'transfer', SM, T('عبد الله الحايك', 'Abdullah Al-Hayek')], ['2026-09-26', '12:15', 6, 'cash', SM, T('سجى أبو حصيرة', 'Saja Abu Hasira')], ['2026-09-24', '15:30', 15, 'cash', A, T('معاذ البيطار', 'Muath Al-Bitar')]];
  olderVisits.forEach(([date, time, amount, method, who, name], i) => visitPays.push({ id: 'ov' + i, name, date, time, amount, method, by: who }));
  visitPays.push({ id: 'ovx', name: T('وسيم عودة', 'Wassim Odeh'), date: '2026-09-27', time: '11:00', amount: 15, method: 'cash', by: SM, voided: T('الزبون لم يبقَ، أُعيد المبلغ', 'The customer didn’t stay; refunded'), voidedBy: A });

  // Attendance statements (per customer, newest first): [date, in, out|null]
  const attendance = {
    m4: [[TODAY, '10:30', null], ['2026-09-27', '09:30', '12:30'], ['2026-09-26', '10:00', '13:00'], ['2026-09-24', '09:00', '12:00'], ['2026-09-23', '09:15', '12:15'], ['2026-09-22', '10:00', '13:00'], ['2026-09-21', '09:00', '12:00'], ['2026-09-20', '09:30', '12:30']],
    m6: [['2026-09-28', '09:00', '15:10'], ['2026-09-27', '08:40', '14:00'], ['2026-09-24', '09:10', '16:00'], ['2026-09-23', '09:00', '13:30'], ['2026-09-21', '10:00', '15:00'], ['2026-09-20', '08:50', '14:20']],
    m1: [[TODAY, '08:05', null], ['2026-09-28', '08:10', '14:00'], ['2026-09-27', '08:02', '14:05'], ['2026-09-26', '08:20', '13:50'], ['2026-09-24', '08:00', '14:00'], ['2026-09-23', '08:15', '14:10'], ['2026-09-22', '08:05', '14:00'], ['2026-09-21', '09:00', '14:00']]
  };

  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const hm = (min) => Math.floor(min / 60) + ':' + String(min % 60).padStart(2, '0');
  const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const fmtDate = (iso, withYear) => new Date(iso + 'T12:00:00').toLocaleDateString(T('ar-EG', 'en-GB'), { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), numberingSystem: 'latn' });
  const money = (n) => (window.LANG === 'en' ? '₪' + n : n + ' ₪');
  // Visits: rounded up to the next hour after a 10-minute grace, capped at the day price.
  const visitCharge = (inT, outT = NOW) => {
    const mins = Math.max(0, toMin(outT) - toMin(inT));
    if (!PRICES.hour) return PRICES.day ? { mode: 'day', mins, hours: 0, amount: PRICES.day } : { mode: 'manual', mins, hours: 0, amount: null };
    const hours = Math.max(1, Math.floor(mins / 60) + (mins % 60 > 10 ? 1 : 0));
    const byHour = hours * PRICES.hour;
    return { mode: 'hour', mins, hours, byHour, capped: byHour > PRICES.day, amount: Math.min(byHour, PRICES.day) };
  };
  const findCustomer = (id) => customers.find((c) => c.id === id);
  const presentOf = (cid) => present.find((p) => p.customerId === cid);
  const currentSub = (c) => c.subs[0] || null;
  const todayMinutes = (c, sub) => { const p = presentOf(c.id); return (sub.used.todayMin || 0) + (p ? toMin(NOW) - toMin(p.since) : 0); };
  const due = (sub, c) => {
    if (sub.billing.type === 'fixed') return sub.billing.amount;
    const extra = c ? Math.ceil(todayMinutesRaw(c) / 60) : 0;
    return ((sub.used.hours || 0) + extra) * sub.billing.rate;
  };
  const todayMinutesRaw = (c) => { const p = presentOf(c.id); return p ? toMin(NOW) - toMin(p.since) : 0; };
  const paid = (sub) => sub.pays.filter((p) => !p[5]).reduce((a, p) => a + p[2], 0);
  const subStatus = (sub) => { const d = daysBetween(TODAY, sub.to); return d < 0 ? 'expired' : d <= 7 ? 'soon' : 'active'; };
  const customerStatus = (c) => (currentSub(c) ? subStatus(currentSub(c)) : 'none');
  const payStatus = (sub, c) => { const d = due(sub, c), p = paid(sub); return p >= d ? 'paid' : p > 0 ? 'partial' : 'unpaid'; };
  const openItems = (c) => [
    ...c.subs.filter((s) => due(s, c) - paid(s) > 0).map((s) => ({ id: s.id, kind: 'sub', label: s.name + ' · ' + fmtDate(s.from) + ' – ' + fmtDate(s.to), date: s.from, due: due(s, c), paid: paid(s) })),
    ...unpaid.filter((u) => u.customerId === c.id).map((u) => ({ id: u.id, kind: 'visit', label: T('زيارة', 'Visit') + ' · ' + fmtDate(u.date), date: u.date, due: u.amount, paid: 0 }))
  ].sort((a, b) => (a.date < b.date ? -1 : 1));
  const balance = (c) => openItems(c).reduce((a, i) => a + i.due - i.paid, 0);
  // Credit: a usage-based subscription paid in advance beyond what's been used.
  const credit = (c) => c.subs.filter((s) => s.billing.type === 'usage').reduce((a, s) => a + Math.max(0, paid(s) - due(s, c)), 0);
  const subKind = (s) => (s.pkg === 'custom' ? 'custom' : pkg(s.pkg).kind);

  // Progress lines for a subscription («أيام 4 من 10 · صالح حتى …»).
  const progress = (sub, c) => {
    const out = [];
    const t = sub.terms || {};
    if (t.totalDays) out.push(T(`أيام ${sub.used.days || 0} من ${t.totalDays}`, `Days ${sub.used.days || 0} of ${t.totalDays}`));
    if (t.daysPerWeek) out.push(T(`هذا الأسبوع ${sub.used.week || 0} من ${t.daysPerWeek}`, `This week ${sub.used.week || 0} of ${t.daysPerWeek}`));
    if (t.weekDays) out.push(T('أيامه: ', 'Days: ') + t.weekDays.map((k) => WEEKDAYS.find((w) => w[0] === k)[1]).join(T('، ', ', ')));
    if (t.hoursPerDay) out.push(T(`ساعات اليوم ${hm(todayMinutes(c, sub))} من ${t.hoursPerDay} س`, `Today ${hm(todayMinutes(c, sub))} of ${t.hoursPerDay} h`));
    if (t.hourBalance) out.push(T(`رصيد الساعات ${sub.used.hours || 0} من ${t.hourBalance} س`, `Hours ${sub.used.hours || 0} of ${t.hourBalance}`));
    if (sub.billing.type === 'usage') out.push(T(`يُحسب من الحضور: ${money(sub.billing.rate)} ${sub.billing.unit === 'hour' ? 'للساعة' : 'لليوم'}`, `Billed from attendance: ${money(sub.billing.rate)} per ${sub.billing.unit}`));
    out.push(subStatus(sub) === 'expired' ? T(`انتهى في ${fmtDate(sub.to)}`, `Ended ${fmtDate(sub.to)}`) : T(`صالح حتى ${fmtDate(sub.to)}`, `Valid until ${fmtDate(sub.to)}`));
    return out;
  };
  const termsLine = (sub) => {
    const P = pkg(sub.pkg); if (P) return P.terms;
    const t = sub.terms || {}; const parts = [];
    if (t.totalDays) parts.push(T(`${t.totalDays} أيام`, `${t.totalDays} days`));
    if (t.daysPerWeek) parts.push(T(`${t.daysPerWeek} أيام بالأسبوع`, `${t.daysPerWeek} days a week`));
    if (t.weekDays) parts.push(t.weekDays.map((k) => WEEKDAYS.find((w) => w[0] === k)[1]).join(T('، ', ', ')));
    if (t.hoursPerDay) parts.push(T(`${t.hoursPerDay} س باليوم`, `${t.hoursPerDay} h a day`));
    if (t.hourBalance) parts.push(T(`رصيد ${t.hourBalance} س`, `${t.hourBalance} h balance`));
    if (sub.shift) parts.push(SHIFTS[sub.shift]);
    return parts.join(' · ') || T('بدون شروط إضافية', 'No extra terms');
  };

  const statusBadge = { active: ['success', T('نشط', 'Active')], soon: ['warning', T('ينتهي قريبًا', 'Ending soon')], expired: ['neutral', T('منتهٍ', 'Expired')], none: ['neutral', T('بدون اشتراك', 'No membership')] };
  const payBadge = { paid: ['success', T('مدفوع', 'Paid')], partial: ['warning', T('مدفوع جزئيًا', 'Partly paid')], unpaid: ['destructive', T('غير مدفوع', 'Unpaid')] };
  const methodLabel = { cash: T('نقدًا', 'Cash'), transfer: T('تحويل', 'Transfer') };

  // Finance demo series (collected, voids excluded). Months oldest → newest, ending Sep 2026.
  const MONTHS = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  const monthly = [[820, 5400], [760, 5100], [690, 4800], [880, 5900], [910, 6100], [640, 4300], [870, 6000], [950, 6400], [1010, 6800], [990, 6700], [1040, 7050], [1120, 7900]];
  const daily30 = [96, 108, 0, 120, 132, 114, 126, 99, 0, 141, 117, 123, 138, 105, 0, 129, 144, 111, 135, 150, 0, 120, 132, 126, 147, 138, 0, 153, 141, 72];
  const heat = { sat: [9, 14, 19, 24, 27, 26, 22, 18, 14, 9], sun: [11, 16, 22, 28, 32, 31, 27, 21, 15, 10], mon: [10, 15, 21, 27, 31, 30, 25, 20, 14, 9], tue: [12, 18, 23, 27, 30, 29, 24, 19, 13, 8], wed: [10, 16, 21, 26, 29, 28, 24, 18, 13, 8], thu: [8, 12, 17, 21, 24, 22, 18, 14, 10, 6] };
  const perDay = [[18, 7], [19, 9], [17, 8], [20, 10], [19, 8], [16, 6], [18, 9], [20, 11], [19, 7], [21, 9], [18, 8], [15, 6], [19, 8], [19, 8]];
  const staffMonth = [[A, 41, 7640, 5120, 2520], [SM, 58, 1380, 1010, 370]];
  const leftToday = 7;

  // One ledger of every payment: subscriptions + visits. p = [date, time, amount, method, by, voidReason, note, voidedBy]
  const ledger = () => {
    const rows = [];
    customers.forEach((c) => c.subs.forEach((s, si) => s.pays.forEach((p, i) => rows.push({ id: s.id + '-' + i, ref: p, date: p[0], time: p[1], amount: p[2], method: p[3], by: p[4], voided: p[5] || null, voidedBy: p[7] || null, who: c.name, customerId: c.id, item: s.name, type: 'sub' }))));
    visitPays.forEach((v) => rows.push({ id: v.id, ref: v, date: v.date, time: v.time, amount: v.amount, method: v.method, by: v.by, voided: v.voided || null, voidedBy: v.voidedBy || null, who: v.name, item: T('زيارة', 'Visit'), type: 'visit' }));
    return rows.sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  };
  const collected = (rows) => rows.filter((r) => !r.voided).reduce((a, r) => a + r.amount, 0);

  return { ledger, collected, MONTHS, monthly, daily30, heat, perDay, staffMonth, leftToday, credit, TODAY, NOW, TODAY_KEY, CLOSE, PRICES, WEEKDAYS, SHIFTS, PACKAGES, pkg, customers, present, unpaid, visitPays, attendance, capacity: 40,
    toMin, hm, daysBetween, addDays, fmtDate, money, visitCharge, findCustomer, presentOf, currentSub, todayMinutes, due, paid, subStatus, customerStatus, payStatus, openItems, balance, subKind, progress, termsLine, statusBadge, payBadge, methodLabel, by, SAMI: SM, AHMAD: A };
})();
