// Platform admin demo data. Admin «باسل». No space-operations data here by design (privacy).
window.ADMIN = (function () {
  const T = window.tr; const M = window.MASAHA;
  const TODAY = '2026-09-29';
  const owners = [
    { id: 'o1', name: T('أحمد', 'Ahmad'), email: 'ahmad@example.com', spaces: ['focus'], status: 'active', joined: '2025-03-02' },
    { id: 'o2', name: T('مها', 'Maha'), email: 'maha@example.com', spaces: ['branch'], status: 'active', joined: '2025-06-18' },
    { id: 'o3', name: T('يوسف', 'Yousef'), email: 'yousef@example.com', spaces: ['numberone'], status: 'active', joined: '2025-11-04' },
    { id: 'o4', name: T('ريما', 'Rima'), email: 'rima@example.com', spaces: [], status: 'suspended', joined: '2026-01-20' }
  ];
  // freshness: days since each group was updated; missing: what the listing lacks.
  const meta = {
    focus: { status: 'verified', upd: { prices: 2, hours: 7, contacts: 20, amenities: 20 }, missing: [], last: '2026-09-27' },
    branch: { status: 'verified', upd: { prices: 3, hours: 12, contacts: 30, amenities: 12 }, missing: [], last: '2026-09-26' },
    numberone: { status: 'verified', upd: { prices: 41, hours: 9, contacts: 65, amenities: 30 }, missing: ['photos'], last: '2026-09-20' },
    zm: { status: 'unverified', upd: { prices: 12, hours: 25, contacts: 25, amenities: 25 }, missing: ['pin'], last: '2026-09-17' },
    golden: { status: 'unverified', upd: { prices: 46, hours: 70, contacts: 70, amenities: 70 }, missing: ['photos'], last: '2026-07-21' },
    white: { status: 'unverified', upd: { prices: 18, hours: 18, contacts: 18, amenities: 18 }, missing: ['hours'], last: '2026-09-11' },
    palm: { status: 'hidden', upd: { prices: 120, hours: 120, contacts: 120, amenities: 120 }, missing: ['prices', 'pin'], last: '2026-05-30' }
  };
  const spaces = [...M.spaces.map((s) => ({ id: s.id, name: s.name, gov: s.gov, area: s.area })), { id: 'palm', name: 'Palm Hub', gov: 'gaza', area: 'sheikh' }]
    .map((s) => ({ ...s, ...meta[s.id], owners: owners.filter((o) => o.spaces.includes(s.id)).map((o) => o.id) }));
  const LIMIT = { prices: 30, other: 60 };
  const staleGroups = (s) => Object.entries(s.upd).filter(([g, d]) => d > (g === 'prices' ? LIMIT.prices : LIMIT.other)).map(([g]) => g);
  const GROUP = { prices: T('الأسعار', 'Prices'), hours: T('ساعات العمل', 'Opening hours'), contacts: T('التواصل', 'Contacts'), amenities: T('المرافق', 'Amenities') };
  const MISSING = { pin: T('بدون دبوس على الخريطة', 'No map pin'), photos: T('بدون صور', 'No photos'), hours: T('بدون ساعات عمل', 'No opening hours'), prices: T('بدون أسعار', 'No prices') };
  const STATUS = { verified: [T('موثّقة', 'Verified'), 'success'], unverified: [T('غير موثّقة', 'Unverified'), 'neutral'], hidden: [T('مخفية', 'Hidden'), 'warning'] };

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
      { id: 'internet', ar: 'إنترنت', en: 'Internet', icon: 'SearchIcon', filter: false, active: true },
      { id: 'power', ar: 'كهرباء مستقرة', en: 'Stable power', icon: 'CircleCheckIcon', filter: false, active: true },
      { id: 'solar', ar: 'طاقة شمسية', en: 'Solar power', icon: 'InfoIcon', filter: true, active: true },
      { id: 'generator', ar: 'خط كهرباء مولّد', en: 'Generator power line', icon: 'TriangleAlertIcon', filter: true, active: true },
      { id: 'drinks', ar: 'مشروبات ساخنة', en: 'Hot drinks', icon: 'CircleAlertIcon', filter: true, active: true },
      { id: 'meeting', ar: 'قاعة اجتماعات', en: 'Meeting room', icon: 'UsersIcon', filter: true, active: true },
      { id: 'rental', ar: 'قاعات للإيجار', en: 'Halls for rent', icon: 'CalendarIcon', filter: true, active: true },
      { id: 'training', ar: 'دورات تدريبية تقنية', en: 'Technical training', icon: 'EyeIcon', filter: true, active: true }
    ]
  };
  const B = T('باسل', 'Basel');
  const audit = [
    ['2026-09-29', '10:42', B, 'temp_password', T('نور سالم', 'Nour Salem'), T('صدرت عبر واتساب · يُطلب التغيير عند الدخول', 'Issued via WhatsApp · change forced at sign-in')],
    ['2026-09-28', '16:05', B, 'space_hidden', 'Palm Hub', T('مغلقة نهائيًا حسب اتصال هاتفي', 'Permanently closed, per phone call')],
    ['2026-09-27', '12:30', B, 'user_suspended', T('خالد النجار', 'Khaled Al-Najjar'), T('بلاغات مسيئة متكررة · انتهت الجلسات', 'Repeated abusive reports · sessions ended')],
    ['2026-09-25', '09:14', B, 'lookup_changed', T('الشجاعية', 'Ash-Shuja’iyya'), T('مخفية ← كانت ظاهرة', 'Hidden ← was shown')],
    ['2026-09-20', '11:50', B, 'owner_linked', T('يوسف ← Number One Hub', 'Yousef → Number One Hub'), T('أصبحت المساحة موثّقة', 'The space became verified')],
    ['2026-09-18', '14:22', B, 'role_changed', T('يوسف', 'Yousef'), T('مستخدم ← مالك', 'User → Owner')],
    ['2026-09-10', '08:40', B, 'settings_changed', T('عتبة حداثة الأسعار', 'Price freshness threshold'), T('30 يومًا (كانت 45)', '30 days (was 45)')],
    ['2026-09-03', '17:15', B, 'lookup_changed', T('إنترنت', 'Internet'), T('لا يظهر في الفلاتر', 'Removed from filters')]
  ];
  const ACTION = { space_hidden: T('إخفاء مساحة', 'Space hidden'), owner_linked: T('ربط مالك', 'Owner linked'), role_changed: T('تغيير دور', 'Role changed'), user_suspended: T('إيقاف مستخدم', 'User suspended'), temp_password: T('كلمة مرور مؤقتة', 'Temporary password'), lookup_changed: T('تعديل قائمة', 'Lookup changed'), settings_changed: T('تعديل الإعدادات', 'Settings changed') };
  const fmt = (iso, y) => new Date(iso + 'T12:00:00').toLocaleDateString(T('ar-EG', 'en-GB'), { day: 'numeric', month: 'short', ...(y ? { year: 'numeric' } : {}), numberingSystem: 'latn' });
  const areaName = (s) => { const g = M.governorates.find((x) => x.id === s.gov); const a = g && g.areas.find((x) => x.id === s.area); return a ? a.name : T('الشيخ رضوان', 'Sheikh Radwan'); };
  return { TODAY, owners, spaces, users, reports, lookups, audit, LIMIT, staleGroups, GROUP, MISSING, STATUS, ROLE, METHOD, handledBy, FIELD, RSTAT, ACTION, fmt, areaName, admin: { name: B, email: 'basel@example.com' } };
})();
