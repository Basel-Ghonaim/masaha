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
  // Membership: start/end ISO dates relative to "today" 2026-09-29.
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
  return { capacity: 40, closeAt: '18:00', owner: { name: T('أحمد', 'Ahmad'), email: 'ahmad@example.com' }, spaces, members, present, log, history, attendanceOf, typeLabel, typeShort, shifts, statusBadge, daysLeft, fmtDate, now: '12:40' };
})();
