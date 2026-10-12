// Platform admin demo data. Admin «باسل». No space-operations data here by design (privacy).
window.ADMIN = (function () {
  const T = window.tr; const M = window.MASAHA;
  const TODAY = '2026-09-29';
  const owners = [
    { id: 'o1', name: T('أحمد', 'Ahmad'), email: 'ahmad@example.com', spaces: ['focus'], status: 'active', joined: '2025-03-02' },
    { id: 'o2', name: T('مها', 'Maha'), email: 'maha@example.com', spaces: ['branch'], status: 'active', joined: '2025-06-18' },
    { id: 'o3', name: T('يوسف', 'Yousef'), email: 'yousef@example.com', spaces: ['numberone'], status: 'active', joined: '2025-11-04' },
    // G3, finding 50: Rima's only space is deleted, so she stays an owner with no space listed.
    { id: 'o4', name: T('ريما', 'Rima'), email: 'rima@example.com', spaces: ['olive'], status: 'suspended', joined: '2026-01-20' }
  ];
  // status is the verification alone (A3): `hidden` and `deleted` are facts of their own.
  // freshness: days since each group was updated; missing: what the listing lacks; own: the
  // space's own amenities («مرافق إضافية»), beside the common list.
  const meta = {
    focus: { status: 'verified', upd: { prices: 2, hours: 7, contacts: 20, amenities: 20 }, missing: [], last: '2026-09-27', own: [{ ar: 'مكتبة كتب تقنية', en: 'Tech library' }] },
    branch: { status: 'verified', upd: { prices: 3, hours: 12, contacts: 30, amenities: 12 }, missing: [], last: '2026-09-26' },
    numberone: { status: 'verified', upd: { prices: 41, hours: 9, contacts: 65, amenities: 30 }, missing: ['photos'], last: '2026-09-20' },
    zm: { status: 'unverified', upd: { prices: 12, hours: 25, contacts: 25, amenities: 25 }, missing: ['pin'], last: '2026-09-17' },
    golden: { status: 'unverified', upd: { prices: 46, hours: 70, contacts: 70, amenities: 70 }, missing: ['photos'], last: '2026-07-21', own: [{ ar: 'غرفة صلاة', en: 'Prayer room' }, { ar: 'خزائن شخصية', en: '' }] },
    white: { status: 'unverified', upd: { prices: 18, hours: 18, contacts: 18, amenities: 18 }, missing: ['hours'], last: '2026-09-11' },
    palm: { status: 'unverified', hidden: true, upd: { prices: 120, hours: 120, contacts: 120, amenities: 120 }, missing: ['prices', 'pin'], last: '2026-05-30' },
    olive: { status: 'verified', deleted: '2026-08-14', upd: { prices: 50, hours: 50, contacts: 50, amenities: 50 }, missing: [], last: '2026-08-10' }
  };
  const spaces = [...M.spaces.map((s) => ({ id: s.id, name: s.name, gov: s.gov, area: s.area })), { id: 'palm', name: 'Palm Hub', gov: 'gaza', area: 'sheikh' }, { id: 'olive', name: 'Olive Desk', gov: 'middle', area: 'deir' }]
    .map((s) => ({ ...s, ...meta[s.id], owners: owners.filter((o) => o.spaces.includes(s.id)).map((o) => o.id) }));
  const LIMIT = { prices: 30, other: 60 };
  const staleGroups = (s) => Object.entries(s.upd).filter(([g, d]) => d > (g === 'prices' ? LIMIT.prices : LIMIT.other)).map(([g]) => g);
  const GROUP = { prices: T('الأسعار', 'Prices'), hours: T('ساعات العمل', 'Opening hours'), contacts: T('التواصل', 'Contacts'), amenities: T('المرافق', 'Amenities') };
  const MISSING = { pin: T('بدون دبوس على الخريطة', 'No map pin'), photos: T('بدون صور', 'No photos'), hours: T('بدون ساعات عمل', 'No opening hours'), prices: T('بدون أسعار', 'No prices') };
  const STATUS = { verified: [T('موثّقة', 'Verified'), 'success'], unverified: [T('غير موثّقة', 'Unverified'), 'neutral'] };
  // The state filter's four choices (A3): the verification, then hidden and deleted.
  const STATE_FILTER = { verified: T('موثّقة', 'Verified'), unverified: T('غير موثّقة', 'Unverified'), hidden: T('مخفية', 'Hidden'), deleted: T('محذوفة', 'Deleted') };

  const users = [
    { id: 'u1', name: T('سارة أحمد', 'Sara Ahmad'), email: 'sara@example.com', role: 'user', method: 'google', joined: '2026-09-27', status: 'active' },
    { id: 'u2', name: T('عمر حلس', 'Omar Hilles'), email: 'omar@example.com', role: 'user', method: 'email', joined: '2026-09-25', status: 'active' },
    { id: 'u3', name: T('ليان حمدان', 'Layan Hamdan'), email: 'layan@example.com', role: 'user', method: 'both', joined: '2026-09-24', status: 'active' },
    { id: 'u4', name: T('خالد النجار', 'Khaled Al-Najjar'), email: 'khaled@example.com', role: 'user', method: 'email', joined: '2026-08-02', status: 'suspended' },
    { id: 'u5', name: T('نور سالم', 'Nour Salem'), email: 'nour@example.com', role: 'user', method: 'google', joined: '2026-09-23', status: 'active' },
    ...owners.map((o, i) => ({ id: 'uo' + i, name: o.name, email: o.email, role: 'owner', method: i === 1 ? 'both' : 'email', joined: o.joined, status: o.status })),
    { id: 'ua', name: T('باسل', 'Basel'), email: 'basel@example.com', role: 'admin', method: 'email', joined: '2025-01-10', status: 'active', me: true }
  ];
  const ROLE = { user: T('مستخدم', 'User'), owner: T('مالك', 'Owner'), admin: T('أدمن', 'Admin') };
  const METHOD = { email: T('بريد', 'Email'), google: 'Google', both: T('كلاهما', 'Both') };

  const reports = [
    { id: 'r1', space: 'golden', field: 'prices', who: T('سارة', 'Sara'), date: '2026-09-28', status: 'new', msg: T('السعر الشهري أصبح 320 ₪.', 'The monthly price is now ₪320.') },
    { id: 'r2', space: 'zm', field: 'location', who: T('يزن', 'Yazan'), date: '2026-09-26', status: 'new', msg: T('المدخل من الشارع الخلفي وليس من شارع النفق.', 'The entrance is from the back street, not An-Nafaq Street.') },
    { id: 'r3', space: 'focus', field: 'hours', who: T('سارة', 'Sara'), date: '2026-09-29', status: 'new', msg: T('صارت المساحة تفتح 09:00 بدل 08:00.', 'The space opens at 09:00 instead of 08:00.') },
    { id: 'r4', space: 'focus', field: 'prices', who: T('عمر', 'Omar'), date: '2026-09-27', status: 'new', msg: T('سعر الأسبوع عند الاستقبال 100 ₪.', 'The weekly price at the desk is ₪100.') },
    { id: 'r5', space: 'white', field: 'contacts', who: T('خالد', 'Khaled'), date: '2026-09-14', status: 'rejected', msg: T('رقم الواتساب لا يرد.', 'The WhatsApp number doesn’t answer.'), reply: T('تواصلنا مع المساحة وتأكّدنا أن الرقم صحيح.', 'We contacted the space and confirmed the number.') },
    { id: 'r6', space: 'branch', field: 'amenities', who: T('ليان', 'Layan'), date: '2026-09-10', status: 'fixed', msg: T('أضافوا قاعة للإيجار.', 'They added a hall for rent.') }
  ];
  const handledBy = (r) => (spaces.find((s) => s.id === r.space).status === 'verified' ? 'owner' : 'admin');
  const FIELD = { prices: T('الأسعار', 'Prices'), hours: T('ساعات العمل', 'Opening hours'), contacts: T('التواصل', 'Contacts'), location: T('الموقع', 'Location'), amenities: T('المرافق', 'Amenities'), other: T('أخرى', 'Other') };
  const RSTAT = { new: [T('جديد', 'New'), 'info'], fixed: [T('تم التصحيح', 'Corrected'), 'success'], rejected: [T('لم يُعتمد', 'Not accepted'), 'neutral'] };

  const lookups = {
    govs: [
      { id: 'north', ar: 'محافظة شمال غزة', en: 'North Gaza', active: true, areas: [{ id: 'north', ar: 'شمال قطاع غزة', en: 'North Gaza Strip', active: true }] },
      { id: 'gaza', ar: 'محافظة غزة', en: 'Gaza City', active: true, areas: [
        { id: 'rimal', ar: 'الرمال', en: 'Al-Rimal', active: true }, { id: 'nasr', ar: 'النصر', en: 'An-Nasr', active: true }, { id: 'sheikh', ar: 'الشيخ رضوان', en: 'Sheikh Radwan', active: true }, { id: 'telhawa', ar: 'تل الهوا', en: 'Tel al-Hawa', active: true },
        { id: 'ijlin', ar: 'الشيخ عجلين', en: 'Sheikh Ijlin', active: true }, { id: 'sabra', ar: 'الصبرة', en: 'As-Sabra', active: true }, { id: 'zeitoun', ar: 'الزيتون', en: 'Az-Zeitoun', active: true }, { id: 'daraj', ar: 'الدرج', en: 'Ad-Daraj', active: true },
        { id: 'tuffah', ar: 'التفاح', en: 'At-Tuffah', active: true }, { id: 'shati', ar: 'الشاطئ', en: 'Ash-Shati', active: true }, { id: 'shujaiya', ar: 'الشجاعية', en: 'Ash-Shuja’iyya', active: false }] },
      { id: 'middle', ar: 'محافظة الوسطى', en: 'Middle Area', active: true, areas: [{ id: 'deir', ar: 'دير البلح', en: 'Deir al-Balah', active: true }, { id: 'nuseirat', ar: 'النصيرات', en: 'An-Nuseirat', active: true }, { id: 'bureij', ar: 'البريج', en: 'Al-Bureij', active: true }, { id: 'maghazi', ar: 'المغازي', en: 'Al-Maghazi', active: true }, { id: 'zawaida', ar: 'الزوايدة', en: 'Az-Zawaida', active: true }] },
      { id: 'khanyounis', ar: 'محافظة خان يونس', en: 'Khan Younis', active: true, areas: [{ id: 'ky', ar: 'خان يونس (المدينة)', en: 'Khan Younis (city)', active: true }, { id: 'mawasi', ar: 'المواصي', en: 'Al-Mawasi', active: true }, { id: 'suheila', ar: 'بني سهيلا', en: 'Bani Suheila', active: false }, { id: 'abasan', ar: 'عبسان', en: 'Abasan', active: false }, { id: 'qarara', ar: 'القرارة', en: 'Al-Qarara', active: false }, { id: 'khuzaa', ar: 'خزاعة', en: 'Khuza’a', active: false }] },
      { id: 'rafah', ar: 'محافظة رفح', en: 'Rafah', active: false, areas: [{ id: 'rafahcity', ar: 'رفح (المدينة)', en: 'Rafah (city)', active: false }, { id: 'sultan', ar: 'تل السلطان', en: 'Tel as-Sultan', active: false }] }
    ],    amenities: [
      { id: 'internet', ar: 'إنترنت', en: 'Internet', icon: 'SearchIcon', active: true },
      { id: 'power', ar: 'كهرباء مستقرة', en: 'Stable power', icon: 'CircleCheckIcon', active: true },
      { id: 'solar', ar: 'طاقة شمسية', en: 'Solar power', icon: 'InfoIcon', active: true },
      { id: 'generator', ar: 'خط كهرباء مولّد', en: 'Generator power line', icon: 'TriangleAlertIcon', active: true },
      { id: 'drinks', ar: 'مشروبات ساخنة', en: 'Hot drinks', icon: 'CircleAlertIcon', active: true },
      { id: 'meeting', ar: 'قاعة اجتماعات', en: 'Meeting room', icon: 'UsersIcon', active: true },
      { id: 'rental', ar: 'قاعات للإيجار', en: 'Halls for rent', icon: 'CalendarIcon', active: true },
      { id: 'training', ar: 'دورات تدريبية تقنية', en: 'Technical training', icon: 'EyeIcon', active: true }
    ]
  };
  const B = T('باسل', 'Basel');
  // P6: the platform's two long lists page like the others — 84 users and 240 audit lines,
  // generated deterministically from the same pools as the rows written out above.
  const aday = (n) => { const d = new Date(TODAY + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const UFIRST = [T('سامي', 'Sami'), T('هالة', 'Hala'), T('رامي', 'Rami'), T('جميلة', 'Jamila'), T('إياد', 'Eyad'), T('ندى', 'Nada'), T('مازن', 'Mazen')];
  const ULAST = [T('أبو زيد', 'Abu Zaid'), T('الطويل', 'Al-Taweel'), T('حمودة', 'Hammouda'), T('سكيك', 'Skaik'), T('الزعانين', 'Al-Zaanin')];
  for (let i = 0; users.length < 84; i++) {
    users.push({ id: 'gu' + i, name: UFIRST[i % UFIRST.length] + ' ' + ULAST[i % ULAST.length],
      email: 'user' + (i + 1) + '@example.com', role: 'user', method: ['email', 'google', 'both'][i % 3],
      joined: aday(-(i % 180) - 1), status: i % 11 === 7 ? 'suspended' : 'active' });
  }

  const audit = [
    ['2026-09-29', '10:42', B, 'temp_password', T('نور سالم', 'Nour Salem'), T('صدرت عبر واتساب · يُطلب التغيير عند الدخول', 'Issued via WhatsApp · change forced at sign-in')],
    ['2026-09-28', '16:05', B, 'space_hidden', 'Palm Hub', T('مغلقة نهائيًا حسب اتصال هاتفي', 'Permanently closed, per phone call')],
    ['2026-09-27', '12:30', B, 'user_suspended', T('خالد النجار', 'Khaled Al-Najjar'), T('بلاغات مسيئة متكررة · انتهت الجلسات', 'Repeated abusive reports · sessions ended')],
    ['2026-09-25', '09:14', B, 'lookup_changed', T('الشجاعية', 'Ash-Shuja’iyya'), T('مخفية ← كانت ظاهرة', 'Hidden ← was shown')],
    ['2026-09-20', '11:50', B, 'owner_linked', T('يوسف ← Number One Hub', 'Yousef → Number One Hub'), T('أصبحت المساحة موثّقة', 'The space became verified')],
    ['2026-09-18', '14:22', B, 'role_changed', T('يوسف', 'Yousef'), T('مستخدم ← مالك', 'User → Owner')],
    ['2026-09-10', '08:40', B, 'settings_changed', T('عتبة حداثة الأسعار', 'Price freshness threshold'), T('30 يومًا (كانت 45)', '30 days (was 45)')],
    ['2026-09-03', '17:15', B, 'lookup_changed', T('إنترنت', 'Internet'), T('الاسم بالإنجليزية: Internet (كان Wi-Fi)', 'English name: Internet (was Wi-Fi)')]
  ];
  // The log is the longest list the admin reads, and the one a reviewer scrolls furthest.
  const AUDIT_FILL = [
    ['lookup_changed', T('تل الهوا', 'Tal Al-Hawa'), T('ظاهرة ← كانت مخفية', 'Shown ← was hidden')],
    ['settings_changed', T('حدّ قِدَم الأسعار', 'Price staleness threshold'), T('14 يومًا ← 21 يومًا', '14 days ← 21 days')],
    ['space_hidden', 'White Space', T('بطلب من المالك', 'At the owner’s request')],
    ['role_changed', T('هالة أبو زيد', 'Hala Abu Zaid'), T('مالك ← مستخدم', 'Owner ← user')],
    ['temp_password', T('رامي حمودة', 'Rami Hammouda'), T('يُطلب التغيير عند الدخول', 'Change forced at sign-in')],
    ['owner_linked', T('ندى سكيك ← ZM Hub', 'Nada Skaik → ZM Hub'), T('أصبحت المساحة موثّقة', 'The space became verified')],
    ['user_suspended', T('مازن الزعانين', 'Mazen Al-Zaanin'), T('بلاغات مسيئة · انتهت الجلسات', 'Abusive reports · sessions ended')]
  ];
  for (let i = 0; audit.length < 240; i++) {
    const [action, target, note] = AUDIT_FILL[i % AUDIT_FILL.length];
    audit.push([aday(-Math.floor(i / 4) - 2), String(8 + (i % 9)).padStart(2, '0') + ':' + String((i * 13) % 60).padStart(2, '0'), B, action, target, note]);
  }

  const ACTION = { space_hidden: T('إخفاء مساحة', 'Space hidden'), owner_linked: T('ربط مالك', 'Owner linked'), role_changed: T('تغيير دور', 'Role changed'), user_suspended: T('إيقاف مستخدم', 'User suspended'), temp_password: T('كلمة مرور مؤقتة', 'Temporary password'), lookup_changed: T('تعديل قائمة', 'Lookup changed'), settings_changed: T('تعديل الإعدادات', 'Settings changed') };
  const fmt = (iso, y) => new Date(iso + 'T12:00:00').toLocaleDateString(T('ar-EG', 'en-GB'), { day: 'numeric', month: 'short', ...(y ? { year: 'numeric' } : {}), numberingSystem: 'latn' });
  // The admin's own catalogue holds every area; the public one only those its sample spaces use.
  const areaName = (s) => { for (const g of lookups.govs) { const a = g.areas.find((x) => x.id === s.area); if (a) return T(a.ar, a.en); } return T('الشيخ رضوان', 'Sheikh Radwan'); };
  return { TODAY, owners, spaces, STATE_FILTER, users, reports, lookups, audit, LIMIT, staleGroups, GROUP, MISSING, STATUS, ROLE, METHOD, handledBy, FIELD, RSTAT, ACTION, fmt, areaName, admin: { name: B, email: 'basel@example.com' } };
})();
