# Masaha project brief (apply to every screen)

- Design system: ONLY Masaha DS components, tokens, conventions (logical sides, words as props). No new colours, fonts, radii, shadows.
- Default: Arabic RTL, light, phone 360 + desktop 1280. "Variants" = add dark theme and English LTR versions of the same screen.
- In scope (dashboard): staff accounts (Reception role) and manual payment recording at the desk (cash / transfer).
- Out of scope — never show or mention: seat booking/reservation, online payment, printed invoices/receipts, expenses and profit, point of sale, reviews/ratings, QR codes, in-app claiming of a space, automated notifications (email/SMS/push).

## Product rules
- Live status is a state, never a number: متاح / ممتلئ / مغلق الآن. Unverified spaces: "لا تتوفر حالة مباشرة". Capacity never shown publicly.
- Prices display only ("للعرض فقط · الدفع في المساحة") with "آخر تحديث قبل …". Periods optional (hour/day/week/month); price may be for students or a shift ("شهري — الوردية الصباحية"). Stale + unverified: hide number, show "السعر غير محدّث — تواصل مع المساحة". Stale + verified: show with "قد يكون تغيّر".
- Areas: governorate → area. Hours: one range per day, Friday often closed; shifts may exist inside hours.
- Contacts are a list (WhatsApp, phone, email, Instagram, Facebook, TikTok, website); numbers LTR.
- Unverified space: "هل أنت صاحب المساحة؟ تواصل معنا". Every space page: "الإبلاغ عن معلومة خاطئة".
- Show loading (skeleton), empty and error states where a screen has data.

## Dashboard roles
- OWNER: نظرة عامة · مكتب الاستقبال · الزبائن · الدفعات · المالية والتقارير · الباقات والأسعار · ملف المساحة · الإعلانات · بلاغات البيانات · الموظفون · الإعدادات; space switcher.
- RECEPTION (one space, no switcher): مكتب الاستقبال · الزبائن · دفعاتي اليوم · الإعلانات. No overview, no income figures.
- Both: top-bar public state badge + «ضبط الحالة» (Full for 30 د / ساعة / ساعتين / حتى الإغلاق).
- No «يومي» membership; a same-day visit is a visit, never a member.

## Sample data
Focus Hub, Number One Hub, Branch Hub, ZM Hub, Golden Hub, White Space in An-Nasr and Al-Rimal (Gaza City). 3–4 ₪/hour, 14–30 ₪/day, 90–150 ₪/week, 270–500 ₪/month; Number One Hub has a student month at 250 ₪. Placeholder phones/emails only.
Dashboard demo: Focus Hub, capacity 40 (private), 27 present; owner «أحمد», receptionist «سامي». Prices ساعة 3 · يوم 15 · أسبوع 90 · شهر 300 · شهر طلاب 250 ₪.
