(function () {
  const M = window.MASAHA;
  const d = {
    focus: {
      nameAr: 'فوكس هاب', photos: 5, statusUpdated: tr("قبل 5 دقائق", "5 minutes ago"), hoursUpdated: tr("قبل أسبوع", "a week ago"),
      about: tr("مساحة عمل هادئة للعمل الفردي والدراسة، فيها طاولات مشتركة وزاوية للمكالمات.", "A quiet space for solo work and study, with shared desks and a corner for calls."),
      address: tr("النصر، شارع النصر، عمارة 12، الطابق الثالث", "An-Nasr, An-Nasr Street, Building 12, 3rd floor"), landmark: tr("قرب مفترق العيون", "Near Al-Oyoun junction"),
      rules: [tr("أقصى مدة جلوس: 4 ساعات في أوقات الذروة", "Maximum stay: 4 hours at peak times"), tr("المكالمات في زاوية المكالمات فقط", "Calls in the call corner only")],
      amenities: ['internet', 'power', 'solar', 'drinks', 'meeting'],
      contacts: [{ type: 'whatsapp', value: '+970 59 000 0000' }, { type: 'jawwal', value: '+970 59 000 0001' }, { type: 'email', value: 'focus@example.com' }, { type: 'instagram', value: 'focushub.example' }, { type: 'facebook', value: 'focushub.example' }],
      announcements: [{ title: tr("ورشة تعريفية عن العمل الحر يوم الأحد الساعة 11:00", "Intro workshop on freelancing, Sunday at 11:00"), date: tr("قبل يومين", "2 days ago") }]
    },
    branch: {
      nameAr: 'برانش هاب', photos: 3, statusUpdated: tr("قبل 12 دقيقة", "12 minutes ago"), hoursUpdated: tr("قبل 3 أيام", "3 days ago"),
      about: tr("مساحة بدوامين، صباحي ومسائي، مع قاعات صغيرة للإيجار للاجتماعات والتدريب.", "A space with two shifts, morning and evening, and small rooms for rent for meetings and training."),
      address: tr("الرمال، شارع الشهداء، الطابق الأول", "Al-Rimal, Al-Shuhada Street, 1st floor"), landmark: tr("مقابل حديقة الجندي المجهول", "Opposite the Unknown Soldier Park"),
      rules: [tr("الاشتراك بالدوام: الصباحي أو المسائي", "Subscriptions are per shift: morning or evening")],
      amenities: ['internet', 'power', 'generator', 'drinks', 'meeting', 'rental'],
      shifts: [{ id: 'am', name: tr("صباحي", "Morning"), long: tr("الدوام الصباحي", "Morning shift"), range: ['08:00', '16:00'] }, { id: 'pm', name: tr("مسائي", "Evening"), long: tr("الدوام المسائي", "Evening shift"), range: ['16:00', '22:00'] }],
      shiftPrices: { am: { day: 18, week: 90, month: 300 }, pm: { day: 16, week: 80, month: 280 } },
      contacts: [{ type: 'whatsapp', value: '+970 59 000 0002' }, { type: 'jawwal', value: '+970 59 000 0003' }, { type: 'ooredoo', value: '+970 56 000 0003' }, { type: 'email', value: 'branch@example.com' }, { type: 'tiktok', value: 'branchhub.example' }],
      announcements: []
    },
    numberone: {
      nameAr: 'نمبر ون هاب', photos: 2, statusUpdated: tr("قبل ساعة", "an hour ago"), hoursUpdated: tr("قبل 5 أيام", "5 days ago"),
      about: tr("مساحة للطلاب والعاملين عن بعد، فيها أسعار شهرية مخفّضة للطلاب ودورات تقنية قصيرة.", "A space for students and remote workers, with reduced monthly student prices and short tech courses."),
      address: tr("النصر، شارع العيون، الطابق الثاني", "An-Nasr, Al-Oyoun Street, 2nd floor"), landmark: tr("بجانب مكتبة النصر", "Next to An-Nasr Library"),
      rules: [tr("السعر الطلابي يتطلب بطاقة جامعية سارية", "The student price needs a valid university ID")],
      amenities: ['internet', 'power', 'solar', 'generator', 'drinks', 'training'],
      closure: { title: tr("مغلقة مؤقتًا حتى الخميس — انقطاع الكهرباء", "Temporarily closed until Thursday — power outage"), date: tr("قبل ساعتين", "2 hours ago") },
      contacts: [{ type: 'whatsapp', value: '+970 59 000 0004' }, { type: 'ooredoo', value: '+970 56 000 0004' }, { type: 'instagram', value: 'numberonehub.example' }],
      announcements: [{ title: tr("تبدأ دورة أساسيات البرمجة الأسبوع القادم", "The programming basics course starts next week"), date: tr("قبل 4 أيام", "4 days ago") }]
    },
    golden: {
      nameAr: 'غولدن هاب', photos: 0, hoursUpdated: tr("قبل 4 أشهر", "4 months ago"), lastReview: tr("2 يونيو 2026", "2 June 2026"),
      about: tr("مساحة صغيرة بطاولات مشتركة ومشروبات ساخنة.", "A small space with shared desks and hot drinks."),
      address: tr("الرمال، شارع الوحدة", "Al-Rimal, Al-Wahda Street"), landmark: tr("قرب دوار السرايا", "Near Al-Saraya roundabout"),
      rules: [],
      amenities: ['internet', 'power', 'solar', 'drinks'],
      contacts: [{ type: 'jawwal', value: '+970 59 000 0005' }],
      announcements: []
    },
    zm: {
      nameAr: 'زد إم هاب', photos: 0, hoursUpdated: tr("قبل أسبوع", "a week ago"), lastReview: tr("20 سبتمبر 2026", "20 September 2026"),
      about: tr("مساحة عمل في شارع النفق.", "A workspace on Al-Nafaq Street."), address: tr("شارع النفق، الشيخ رضوان", "Al-Nafaq Street, Sheikh Radwan"), landmark: '', rules: [],
      amenities: ['internet', 'power', 'generator'], contacts: [{ type: 'whatsapp', value: '+970 59 000 0006' }], announcements: []
    },
    white: {
      nameAr: 'وايت سبيس', photos: 1, hoursUpdated: tr("قبل 10 أيام", "10 days ago"), lastReview: tr("18 سبتمبر 2026", "18 September 2026"),
      about: tr("مساحة واسعة بإضاءة طبيعية وقاعات للإيجار.", "A large space with natural light and rooms for rent."), address: tr("الرمال، شارع الثلاثيني", "Al-Rimal, Al-Thalathini Street"), landmark: '', rules: [],
      amenities: ['internet', 'power', 'solar', 'meeting', 'rental'], contacts: [{ type: 'whatsapp', value: '+970 59 000 0007' }, { type: 'email', value: 'white@example.com' }], announcements: []
    }
  };
  M.spaces.forEach((s) => Object.assign(s, d[s.id]));
  M.allAmenities = [{ id: 'internet', name: tr("إنترنت", "Internet") }, { id: 'power', name: tr("كهرباء مستقرة", "Stable power") }].concat(M.amenities);
  M.channels = {
    whatsapp: { label: tr("واتساب", "WhatsApp"), href: (v) => 'https://wa.me/' + v.replace(/\D/g, '') },
    jawwal: { label: tr("اتصال — جوال", "Call — Jawwal"), href: (v) => 'tel:' + v.replace(/\s/g, ''), phone: true },
    ooredoo: { label: tr("اتصال — أوريدو", "Call — Ooredoo"), href: (v) => 'tel:' + v.replace(/\s/g, ''), phone: true },
    email: { label: tr("بريد", "Email"), href: (v) => 'mailto:' + v },
    instagram: { label: 'Instagram', href: (v) => 'https://instagram.com/' + v, latin: true },
    facebook: { label: 'Facebook', href: (v) => 'https://facebook.com/' + v, latin: true },
    tiktok: { label: 'TikTok', href: (v) => 'https://tiktok.com/@' + v, latin: true },
    website: { label: tr("الموقع الإلكتروني", "Website"), href: (v) => v }
  };
  M.platformContact = { whatsapp: '+970 59 000 0099', email: 'hello@example.com' };
  M.weekOrder = [['sat', tr("السبت", "Saturday")], ['sun', tr("الأحد", "Sunday")], ['mon', tr("الاثنين", "Monday")], ['tue', tr("الثلاثاء", "Tuesday")], ['wed', tr("الأربعاء", "Wednesday")], ['thu', tr("الخميس", "Thursday")], ['fri', tr("الجمعة", "Friday")]];
})();
