// Owner demo data (private view): Focus Hub, capacity 40, 27 present. Invented names, placeholder phones.
window.OWNER = (function () {
  const T = window.tr;
  const people = [
    ['m1', T('محمد العطار', 'Mohammed Al-Attar'), '+970 59 000 1001', 'month', 'am'], ['m2', T('ليان حمدان', 'Layan Hamdan'), '+970 59 000 1002', 'month', null],
    ['m3', T('يوسف أبو شعبان', 'Yousef Abu Shaaban'), '+970 56 000 1003', 'week', null], ['m4', T('نور الهدى سالم', 'Nour Al-Huda Salem'), '+970 59 000 1004', 'month', 'pm'],
    ['m5', T('أحمد الشوا', 'Ahmad Al-Shawa'), '+970 59 000 1005', 'day', null], ['m6', T('رهف قديح', 'Rahaf Qudaih'), '', 'month', null],
    ['m7', T('خالد النجار', 'Khaled Al-Najjar'), '+970 56 000 1007', 'week', null], ['m8', T('سلمى الريس', 'Salma Al-Rayyes'), '+970 59 000 1008', 'month', 'am'],
    ['m9', T('عمر حلس', 'Omar Hilles'), '+970 59 000 1009', 'month', null], ['m10', T('دانة الغول', 'Dana Al-Ghoul'), '+970 59 000 1010', 'week', null],
    ['m11', T('إبراهيم عاشور', 'Ibrahim Ashour'), '+970 56 000 1011', 'month', null], ['m12', T('ميار سكيك', 'Mayar Skaik'), '+970 59 000 1012', 'month', 'pm']
  ];
  // Subscription: start/end ISO dates relative to "today" 2026-09-29.
  const ends = { m1: '2026-10-21', m2: '2026-10-02', m3: '2026-10-03', m4: '2026-10-25', m5: '2026-09-29', m6: '2026-09-26', m7: '2026-10-05', m8: '2026-11-10', m9: '2026-10-01', m10: '2026-09-20', m11: '2026-10-28', m12: '2026-10-04' };
  const starts = { m1: '2026-09-21', m2: '2026-09-02', m3: '2026-09-26', m4: '2026-09-25', m5: '2026-09-29', m6: '2026-08-26', m7: '2026-09-28', m8: '2026-10-10', m9: '2026-09-01', m10: '2026-09-13', m11: '2026-09-28', m12: '2026-09-04' };
  const TODAY = new Date('2026-09-29T12:00:00');
  const daysLeft = (iso) => Math.round((new Date(iso + 'T12:00:00') - TODAY) / 864e5);
  const members = people.map(([id, name, phone, type, shift]) => ({ id, name, phone, type, shift, start: starts[id], end: ends[id] }));
  members.forEach((m) => { const d = daysLeft(m.end); m.status = d < 0 ? 'expired' : d <= 7 ? 'soon' : 'active'; m.daysLeft = d; });
  const typeLabel = { day: T('زائر يومي', 'Day visitor'), week: T('مشترك أسبوعي', 'Weekly member'), month: T('مشترك شهري', 'Monthly member') };
  const typeShort = { day: T('يومي', 'Daily'), week: T('أسبوعي', 'Weekly'), month: T('شهري', 'Monthly') };
  const shifts = { am: T('صباحي', 'Morning'), pm: T('مسائي', 'Evening') };
  const statusBadge = { active: ['success', T('نشط', 'Active')], soon: ['warning', T('ينتهي قريبًا', 'Ending soon')], expired: ['neutral', T('منتهٍ', 'Expired')] };
  // 27 present now: 12 members' first names reused with visitors to fill the list.
  const visitorNames = [T('زائر', 'Visitor')];
  const present = [];
  const times = ['07:58', '08:05', '08:12', '08:20', '08:31', '08:40', '08:47', '08:55', '09:02', '09:12', '09:18', '09:26', '09:33', '09:41', '09:50', '10:04', '10:15', '10:22', '10:30', '10:44', '10:58', '11:06', '11:20', '11:35', '11:48', '12:02', '12:15', '12:30'];
  const extra = [T('هبة المصري', 'Heba Al-Masri'), T('سامي عوض', 'Sami Awad'), T('تالا شراب', 'Tala Sharab'), T('بلال زقوت', 'Bilal Zaqout'), T('روان مهنا', 'Rawan Muhanna'), T('آدم الحلو', 'Adam Al-Helou'), T('جنى أبو ندى', 'Jana Abu Nada'), T('مالك صيام', 'Malek Siam'), T('ريم بكر', 'Reem Bakr'), T('حسن الطويل', 'Hasan Al-Taweel'), T('لمى الكرد', 'Lama Al-Kurd'), T('زياد ضاهر', 'Ziad Daher'), T('فرح جابر', 'Farah Jaber'), T('أنس البنا', 'Anas Al-Banna'), T('شهد حجازي', 'Shahd Hijazi'), T('كريم دلول', 'Karim Dalloul'), T('مريم الخالدي', 'Maryam Al-Khalidi')];
  const presentMembers = members.filter((m) => m.status !== 'expired').slice(0, 11);
  presentMembers.forEach((m, i) => present.push({ id: 'p' + i, memberId: m.id, name: m.name, type: m.type, shift: m.shift, in: times[i] }));
  extra.forEach((n, i) => present.push({ id: 'v' + i, name: n, type: 'day', shift: null, in: times[11 + i] }));
  present.reverse();
  const log = [
    [T('محمد العطار', 'Mohammed Al-Attar'), '08:04', '14:02', 'manual'], [T('ليان حمدان', 'Layan Hamdan'), '08:30', '18:00', 'auto'], [T('يوسف أبو شعبان', 'Yousef Abu Shaaban'), '09:10', '13:45', 'manual'],
    [T('نور الهدى سالم', 'Nour Al-Huda Salem'), '14:00', '18:00', 'auto'], [T('هبة المصري', 'Heba Al-Masri'), '10:20', '12:05', 'manual'], [T('خالد النجار', 'Khaled Al-Najjar'), '08:15', '17:30', 'manual'],
    [T('سامي عوض', 'Sami Awad'), '11:00', '18:00', 'auto'], [T('عمر حلس', 'Omar Hilles'), '09:40', '16:10', 'manual']
  ];
  const spaces = [{ id: 'focus', name: 'Focus Hub', area: T('النصر', 'An-Nasr') }, { id: 'focus2', name: 'Focus Hub — Al-Rimal', area: T('الرمال', 'Al-Rimal') }];
  const history = { m1: [['2026-09-21', '2026-10-21', 'month'], ['2026-08-21', '2026-09-20', 'month'], ['2026-08-14', '2026-08-20', 'week']] };
  const attendanceOf = { m1: [['2026-09-29', '08:05', null], ['2026-09-28', '08:10', '14:00'], ['2026-09-27', '08:02', '14:05'], ['2026-09-26', '08:20', '13:50'], ['2026-09-24', '08:00', '14:00'], ['2026-09-23', '08:15', '14:10'], ['2026-09-22', '08:05', '14:00'], ['2026-09-21', '09:00', '14:00'], ['2026-09-20', '08:10', '12:30'], ['2026-09-19', '08:00', '14:00']] };
  const fmtDate = (iso) => { const d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString(T('ar-EG', 'en-GB'), { day: 'numeric', month: 'short', numberingSystem: 'latn' }); };
  // The fix phase's sample states: ?demo=missing,nocapacity,clear,noshifts (a comma list).
  const DEMO = (new URLSearchParams(location.search).get('demo') || '').split(',');
  const demo = (k) => DEMO.includes(k);
  const NOW_ISO = '2026-09-29T12:40';
  // A1: each fact group's age in days. Prices are out of date after 30 days, the rest after 60.
  // ?demo=missing takes the amenities back to never saved (A2); ?demo=clear makes every group fresh.
  const groups = demo('clear') ? { profile: 3, hours: 3, prices: 3, amenities: 3, contacts: 3 } : { profile: 14, hours: 12, prices: 34, amenities: 20, contacts: 75 };
  const LIMIT = { prices: 30, other: 60 };
  const missing = demo('missing') ? ['amenities'] : [];
  // O9: an announcement as the model holds it — a type, an Arabic text, an optional English one, a
  // start and an end (null: until it is ended). No title and no author.
  const announcements = [
    { id: 'a1', type: 'closure', textAr: 'مغلقة مؤقتًا من الخميس حتى السبت لصيانة المولّد. نعود يوم الأحد.', textEn: 'Closed Thursday to Saturday for generator maintenance. We reopen on Sunday.', from: '2026-10-01T08:00', to: '2026-10-03T18:00' },
    { id: 'a2', type: 'event', textAr: 'ورشة مجانية عن أدوات العمل عن بُعد يوم الأحد الساعة 11:00 في قاعة الاجتماعات.', textEn: 'A free workshop on remote-work tools on Sunday at 11:00 in the meeting room.', from: '2026-09-27T08:00', to: '2026-10-04T13:00' },
    { id: 'a3', type: 'offer', textAr: 'شهري الطلاب 250 ₪ — أحضر بطاقتك الجامعية إلى الاستقبال.', textEn: 'Student month ₪250 — bring your student card to the front desk.', from: '2026-09-15T08:00', to: null },
    { id: 'a6', type: 'closure', textAr: 'مغلقة بسبب انقطاع الكهرباء في المنطقة.', textEn: 'Closed because of a power cut in the area.', from: '2026-09-24T08:00', to: '2026-09-25T18:00' },
    { id: 'a5', type: 'outage', textAr: 'الإنترنت بطيء هذا الصباح، ونعمل على إصلاحه.', textEn: '', from: '2026-09-22T08:00', to: '2026-09-22T12:00' },
    { id: 'a4', type: 'closure', textAr: 'مغلقة لصيانة المولّد.', textEn: 'Closed for generator maintenance.', from: '2026-09-14T08:00', to: '2026-09-16T18:00', extended: { count: 19, days: 3, by: T('أحمد', 'Ahmad'), on: '2026-09-17' } }
  ];
  // O12: the reporter is anonymous to the owner — no name is sent; the admin keeps it.
  const reports = demo('clear') ? [] : [
    { id: 'd1', field: 'hours', date: '2026-09-29', status: 'new', msg: T('صارت المساحة تفتح 09:00 بدل 08:00 منذ بداية الأسبوع.', 'The space opens at 09:00 instead of 08:00 since the start of the week.') },
    { id: 'd2', field: 'prices', date: '2026-09-27', status: 'new', msg: T('سعر الأسبوع عند الاستقبال 100 ₪ وليس 90 ₪.', 'The weekly price at the desk is ₪100, not ₪90.') },
    { id: 'd3', field: 'amenities', date: '2026-09-20', status: 'fixed', msg: T('أضافوا قاعة اجتماعات جديدة في الطابق نفسه.', 'They added a new meeting room on the same floor.'), reply: T('شكرًا، أضفنا القاعة إلى المرافق.', 'Thanks, we added the room to the amenities.') },
    { id: 'd4', field: 'contacts', date: '2026-09-12', status: 'rejected', msg: T('رقم الواتساب لا يرد.', 'The WhatsApp number doesn’t answer.'), reply: T('الرقم صحيح، نرد خلال ساعات العمل.', 'The number is correct; we reply during opening hours.') }
  ];
  // O13: the space's own log — saves and confirms, packages, announcements, the extension, payments,
  // staff and settings. An automatic check-out has no actor: the system did it.
  const AH = T('أحمد', 'Ahmad'), SA = T('سامي', 'Sami');
  const audit = [
    ['2026-09-29', '12:10', SA, 'payment_recorded', T('يوسف أبو شعبان', 'Yousef Abu Shaaban'), T('50 ₪ · تحويل', '₪50 · transfer')],
    ['2026-09-29', '09:15', SA, 'payment_recorded', T('نور الهدى سالم', 'Nour Al-Huda Salem'), T('30 ₪ · نقدًا', '₪30 · cash')],
    ['2026-09-28', '18:00', null, 'auto_checkout', T('مالك صيام', 'Malek Siam'), T('خروج تلقائي عند الإغلاق · زيارة غير محصّلة', 'Checked out at closing · visit not collected')],
    ['2026-09-28', '16:40', AH, 'staff_added', T('ليلى', 'Laila'), T('حساب جديد · كلمة مرور مؤقتة سُلّمت شفهيًا', 'New account · temporary password handed over in person')],
    ['2026-09-27', '11:20', AH, 'announcement_published', T('فعالية · ورشة تعريفية', 'Event · intro workshop'), T('من 27 سبتمبر', 'From 27 September')],
    ['2026-09-26', '13:05', AH, 'group_saved', T('ساعات العمل', 'Opening hours'), T('الجمعة: مغلقة', 'Friday: closed')],
    ['2026-09-25', '10:30', AH, 'payment_voided', T('رهف قديح', 'Rahaf Qudaih'), T('50 ₪ · سُجّلت مرتين بالخطأ', '₪50 · recorded twice by mistake')],
    ['2026-09-24', '08:05', AH, 'announcement_published', T('إغلاق مؤقت · انقطاع الكهرباء', 'Temporary closure · power cut'), T('24–25 سبتمبر', '24–25 September')],
    ['2026-09-22', '12:00', SA, 'announcement_ended', T('انقطاع · الإنترنت بطيء', 'Outage · slow internet'), T('أُنهي الآن', 'Ended now')],
    ['2026-09-20', '09:30', AH, 'package_paused', T('صباحي للطلاب', 'Student mornings'), T('لم تعد متاحة في المكتب', 'No longer offered at the desk')],
    ['2026-09-17', '10:00', AH, 'subscriptions_extended', T('إغلاق 14–16 سبتمبر', 'Closure 14–16 September'), T('19 اشتراكًا · 3 أيام', '19 subscriptions · 3 days')],
    ['2026-09-15', '17:45', AH, 'staff_deactivated', T('هالة', 'Hala'), T('انتهت جلساتها', 'Sessions ended')],
    ['2026-09-12', '15:10', AH, 'report_dismissed', T('بلاغ عن التواصل', 'Report on the contacts'), T('لم يُعتمد · بردّ', 'Not accepted · with a reply')],
    ['2026-09-10', '11:00', AH, 'group_confirmed', T('الأسعار', 'Prices'), T('ما زالت صحيحة', 'Still correct')],
    ['2026-09-05', '14:20', AH, 'settings_changed', T('تسعير الزيارات', 'Visit pricing'), T('التقريب: لأعلى بعد 15 دقيقة', 'Rounding: up after 15 minutes')],
    ['2026-09-01', '09:00', AH, 'photo_removed', T('صورة 6', 'Photo 6'), '']
  ];
  // P6: enough lines to page — one desk day after another, deterministic.
  const FILL = [[SA, 'payment_recorded', T('زيارة', 'Visit'), T('15 ₪ · نقدًا', '₪15 · cash')], [AH, 'payment_recorded', T('اشتراك شهري', 'Monthly subscription'), T('300 ₪ · تحويل', '₪300 · transfer')], [null, 'auto_checkout', T('زيارة', 'Visit'), T('خروج تلقائي عند الإغلاق', 'Checked out at closing')], [SA, 'customer_created', T('زبون جديد', 'A new customer'), '']];
  for (let i = 0; audit.length < 64; i++) { const d = new Date('2026-09-29T12:00:00'); d.setDate(d.getDate() - 2 - Math.floor(i / 3)); const [a, act, t, x] = FILL[i % FILL.length]; audit.push([d.toISOString().slice(0, 10), String(9 + (i % 8)).padStart(2, '0') + ':' + String((i * 17) % 60).padStart(2, '0'), a, act, t, x]); }
  return { capacity: demo('nocapacity') ? null : 40, closeAt: '18:00', owner: { name: T('أحمد', 'Ahmad'), email: 'ahmad@example.com' }, spaces, members, present, log, history, attendanceOf, typeLabel, typeShort, shifts, statusBadge, daysLeft, fmtDate, now: '12:40', demo, NOW_ISO, groups, LIMIT, missing, announcements, reports, audit };
})();
