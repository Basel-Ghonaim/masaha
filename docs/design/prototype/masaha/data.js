window.MASAHA = (function () {
  const week = (open, close, fri = null) => ({ sat: [open, close], sun: [open, close], mon: [open, close], tue: [open, close], wed: [open, close], thu: [open, close], fri });
  const governorates = [
    { id: 'gaza', name: tr("محافظة غزة", "Gaza City"), areas: [{ id: 'nasr', name: tr("النصر", "An-Nasr") }, { id: 'rimal', name: tr("الرمال", "Al-Rimal") }, { id: 'sheikh', name: tr("الشيخ رضوان", "Sheikh Radwan") }] },
    { id: 'north', name: tr("محافظة شمال غزة", "North Gaza"), areas: [] },
    { id: 'middle', name: tr("محافظة الوسطى", "Middle Area"), areas: [] },
    { id: 'khanyounis', name: tr("محافظة خان يونس", "Khan Younis"), areas: [] },
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
  const spaces = [
    { id: 'focus', name: 'Focus Hub', gov: 'gaza', area: 'nasr', verified: true, status: 'open', prices: { hour: 3, day: 15, week: 90, month: 300 }, updatedDays: 2, updated: tr("قبل يومين", "2 days ago"), stale: false, hours: week('08:00', '18:00'), amenities: ['solar', 'drinks', 'meeting'], lat: 31.5335, lng: 34.4560 },
    { id: 'branch', name: 'Branch Hub', gov: 'gaza', area: 'rimal', verified: true, status: 'full', prices: { hour: 4, day: 30, week: 150, month: 500 }, updatedDays: 3, updated: tr("قبل 3 أيام", "3 days ago"), stale: false, hours: week('08:00', '22:00'), amenities: ['generator', 'drinks', 'meeting', 'rental'], lat: 31.5230, lng: 34.4430 },
    { id: 'numberone', name: 'Number One Hub', gov: 'gaza', area: 'nasr', verified: true, status: 'closed', prices: { hour: 3, day: 15, week: 90, month: 300 }, studentMonth: 250, updatedDays: 5, updated: tr("قبل 5 أيام", "5 days ago"), stale: false, hours: week('08:00', '18:00'), amenities: ['solar', 'generator', 'drinks', 'training'], lat: 31.5360, lng: 34.4610 },
    { id: 'zm', name: 'ZM Hub', gov: 'gaza', area: 'sheikh', verified: false, status: null, prices: { hour: 3, day: 14, month: 270 }, updatedDays: 7, updated: tr("قبل أسبوع", "a week ago"), stale: false, hours: week('08:00', '18:00'), amenities: ['generator'], lat: 31.5290, lng: 34.4680 },
    { id: 'golden', name: 'Golden Hub', gov: 'gaza', area: 'rimal', verified: false, status: null, prices: { hour: 3, day: 15, month: 300 }, updatedDays: 120, updated: tr("قبل 4 أشهر", "4 months ago"), stale: true, hours: week('08:00', '18:00'), amenities: ['solar', 'drinks'], lat: 31.5195, lng: 34.4470 },
    { id: 'white', name: 'White Space', gov: 'gaza', area: 'rimal', verified: false, status: null, prices: { day: 15, week: 100, month: 350 }, updatedDays: 10, updated: tr("قبل 10 أيام", "10 days ago"), stale: false, hours: week('08:00', '19:00'), amenities: ['solar', 'meeting', 'rental'], lat: 31.5255, lng: 34.4385 }
  ];
  spaces.forEach((s) => { s.others = [s.studentMonth ? 'students' : null, s.hours.fri ? 'friday' : null].filter(Boolean); });
  const areaName = (id) => { for (const g of governorates) for (const a of g.areas) if (a.id === id) return a.name; return ''; };
  const govName = (id) => (governorates.find((g) => g.id === id) || {}).name || '';
  const govShort = (id) => govName(id).replace('محافظة ', '');
  const priceHidden = (s) => s.stale && !s.verified;
  const minPrice = (s, period) => {
    if (priceHidden(s)) return Infinity;
    if (period) return s.prices[period] ?? Infinity;
    const p = periods.map((x) => s.prices[x.id]).filter((v) => v != null);
    return p.length ? Math.min(...p) : Infinity;
  };
  const distanceKm = (a, b) => {
    const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  };
  const bounds = { north: 31.541, south: 31.514, west: 34.432, east: 34.474 };
  const demoUser = { lat: 31.5280, lng: 34.4520, accuracy: 120 };
  return { governorates, periods, amenities, others, spaces, areaName, govName, govShort, priceHidden, minPrice, distanceKm, bounds, demoUser };
})();
