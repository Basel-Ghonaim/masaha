window.MASAHA = (function () {
  const week = (open, close, fri = null) => ({ sat: [open, close], sun: [open, close], mon: [open, close], tue: [open, close], wed: [open, close], thu: [open, close], fri });
  // An area keeps both names: the directory's search matches either (U3).
  const area = (id, ar, en) => ({ id, name: tr(ar, en), ar, en });
  // The public catalogue: the active governorates and their active areas, as the admin's lookups
  // seed them (admin-data.js). Rafah is hidden, so it and its areas are left out.
  const governorates = [
    { id: 'north', name: tr("محافظة شمال غزة", "North Gaza"), areas: [area('north', "شمال قطاع غزة", "North Gaza Strip")] },
    { id: 'gaza', name: tr("محافظة غزة", "Gaza City"), areas: [area('rimal', "الرمال", "Al-Rimal"), area('nasr', "النصر", "An-Nasr"), area('sheikh', "الشيخ رضوان", "Sheikh Radwan"), area('telhawa', "تل الهوا", "Tel al-Hawa"), area('ijlin', "الشيخ عجلين", "Sheikh Ijlin"), area('sabra', "الصبرة", "As-Sabra"), area('zeitoun', "الزيتون", "Az-Zeitoun"), area('daraj', "الدرج", "Ad-Daraj"), area('tuffah', "التفاح", "At-Tuffah"), area('shati', "الشاطئ", "Ash-Shati")] },
    { id: 'middle', name: tr("محافظة الوسطى", "Middle Area"), areas: [area('deir', "دير البلح", "Deir al-Balah"), area('nuseirat', "النصيرات", "An-Nuseirat"), area('bureij', "البريج", "Al-Bureij"), area('maghazi', "المغازي", "Al-Maghazi"), area('zawaida', "الزوايدة", "Az-Zawaida")] },
    { id: 'khanyounis', name: tr("محافظة خان يونس", "Khan Younis"), areas: [area('ky', "خان يونس (المدينة)", "Khan Younis (city)"), area('mawasi', "المواصي", "Al-Mawasi")] },
    { id: 'rafah', name: tr("محافظة رفح", "Rafah"), areas: [], hidden: true }
  ];
  const periods = [
    { id: 'hour', short: tr("ساعة", "Hour"), filter: tr("بالساعة", "Hourly") },
    { id: 'day', short: tr("يوم", "Day"), filter: tr("يومي", "Daily") },
    { id: 'week', short: tr("أسبوع", "Week"), filter: tr("أسبوعي", "Weekly") },
    { id: 'month', short: tr("شهر", "Month"), filter: tr("شهري", "Monthly") }
  ];
  const amenities = [
    { id: 'solar', name: tr("طاقة شمسية", "Solar power") },
    { id: 'generator', name: tr("خط كهرباء مولّد", "Generator power line") },
    { id: 'drinks', name: tr("مشروبات ساخنة", "Hot drinks") },
    { id: 'meeting', name: tr("قاعة اجتماعات", "Meeting room") },
    { id: 'rental', name: tr("قاعات للإيجار", "Halls for rent") },
    { id: 'training', name: tr("دورات تدريبية تقنية", "Technical training") }
  ];
  const others = [
    { id: 'students', name: tr("أسعار للطلاب", "Student prices") },
    { id: 'friday', name: tr("مفتوحة يوم الجمعة", "Open on Friday") }
  ];
  // Amenities per space are placeholders until the owner confirms them.
  // `photos`: how many the space has; the first is its cover on every card (U12).
  // A space's name is English required, Arabic optional (data model): ZM Hub has the English one only.
  const spaces = [
    { id: 'focus', nameAr: 'فوكس هاب', name: 'Focus Hub', gov: 'gaza', area: 'nasr', photos: 5, verified: true, status: 'open', prices: { hour: 3, day: 15, week: 90, month: 300 }, updatedDays: 2, stale: false, hours: week('08:00', '18:00'), amenities: ['solar', 'drinks', 'meeting'], lat: 31.5335, lng: 34.4560 },
    { id: 'branch', nameAr: 'برانش هاب', name: 'Branch Hub', gov: 'gaza', area: 'rimal', photos: 3, verified: true, status: 'full', prices: { hour: 4, day: 30, week: 150, month: 500 }, updatedDays: 3, stale: false, hours: week('08:00', '22:00'), amenities: ['generator', 'drinks', 'meeting', 'rental'], lat: 31.5230, lng: 34.4430 },
    { id: 'numberone', nameAr: 'نمبر ون هاب', name: 'Number One Hub', gov: 'gaza', area: 'nasr', photos: 2, verified: true, status: 'closed', prices: { hour: 3, day: 15, week: 90, month: 300 }, studentMonth: 250, updatedDays: 5, stale: false, hours: week('08:00', '18:00'), amenities: ['solar', 'generator', 'drinks', 'training'], lat: 31.5360, lng: 34.4610 },
    { id: 'zm', name: 'ZM Hub', gov: 'gaza', area: 'sheikh', photos: 0, verified: false, status: null, prices: { hour: 3, day: 14, month: 270 }, updatedDays: 7, stale: false, hours: week('08:00', '18:00'), amenities: ['generator'], lat: 31.5290, lng: 34.4680 },
    { id: 'golden', nameAr: 'غولدن هاب', name: 'Golden Hub', gov: 'gaza', area: 'rimal', photos: 0, verified: false, status: null, prices: { hour: 3, day: 15, month: 300 }, updatedDays: 120, stale: true, hours: week('08:00', '18:00'), amenities: ['solar', 'drinks'], lat: 31.5195, lng: 34.4470 },
    { id: 'white', nameAr: 'وايت سبيس', name: 'White Space', gov: 'gaza', area: 'rimal', photos: 1, verified: false, status: null, prices: { day: 15, week: 100, month: 350 }, updatedDays: 10, stale: false, hours: week('08:00', '19:00'), amenities: ['solar', 'meeting', 'rental'], lat: 31.5255, lng: 34.4385 }
  ];
  spaces.forEach((s) => { s.others = [s.studentMonth ? 'students' : null, s.hours.fri ? 'friday' : null].filter(Boolean); });
  const findArea = (id) => { for (const g of governorates) for (const a of g.areas) if (a.id === id) return a; return null; };
  const areaName = (id) => (findArea(id) || {}).name || '';
  const areaGov = (id) => governorates.find((g) => g.areas.some((a) => a.id === id));
  const govName = (id) => (governorates.find((g) => g.id === id) || {}).name || '';
  const govShort = (id) => govName(id).replace('محافظة ', '');
  const priceHidden = (s) => s.stale && !s.verified;
  const distanceKm = (a, b) => {
    const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  };
  const bounds = { north: 31.541, south: 31.514, west: 34.432, east: 34.474 };
  const demoUser = { lat: 31.5280, lng: 34.4520, accuracy: 120 };
  return { governorates, periods, amenities, others, spaces, findArea, areaName, areaGov, govName, govShort, priceHidden, distanceKm, bounds, demoUser };
})();
