const { Field: RField, Input: RInput, Textarea: RTextarea, Select: RSelect, SelectTrigger: RTrigger, SelectValue: RValue, SelectContent: RContent, SelectItem: RItem, Button: RButton, Badge: RBadge, Combobox: RCombobox, ComboboxTrigger: RComboTrigger, ComboboxContent: RComboContent, ComboboxGroup: RComboGroup, ComboboxItem: RComboItem, toast: rtoast } = window.MasahaDesignSystem;

// A missing language says what it costs (B1, L1).
const PfLangNote = ({ children }) => <p className="rounded-lg bg-warning-subtle px-3 py-2 text-body-sm text-warning-subtle-foreground">{children}</p>;

// ---------------------------------------------------------------------------------------------
// عن المساحة (B1–B2): the two languages side by side, each in its own direction.
// ---------------------------------------------------------------------------------------------
function PfAboutColumn({ lang, v }) {
  const ar = lang === 'ar';
  const name = ar ? v.nameAr : v.nameEn;
  const desc = ar ? v.descAr : v.descEn;
  const [all, setAll] = React.useState(false);
  const long = desc.length > 240;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h3 className="text-caption text-muted-foreground">{ar ? tr('بالعربية', 'In Arabic') : tr('بالإنجليزية', 'In English')}</h3>
      <div lang={lang} dir={ar ? 'rtl' : 'ltr'} className="flex flex-col gap-2">
        {name ? <p className="text-heading-3">{name}</p> : <p className="text-body text-muted-foreground" lang={LANG} dir={DIR}>{tr('لم يُضف الاسم بالعربية.', 'No Arabic name yet.')}</p>}
        {desc && <p className={'text-body ' + (long && !all ? 'pf-clamp' : '')}>{desc}</p>}
      </div>
      {desc && long && <div><RButton type="button" variant="link" size="sm" className="px-0" aria-expanded={all} onClick={() => setAll(!all)}>{all ? tr('عرض أقل', 'Show less') : tr('عرض المزيد', 'Show more')}</RButton></div>}
      {!desc && <PfLangNote>{ar ? tr('الوصف بالعربية لم يُضف. زوار الموقع بالعربية لن يروا وصفًا لمساحتك.', 'No Arabic description yet. Visitors using the site in Arabic won’t see a description of your space.') : tr('الوصف بالإنجليزية لم يُضف. زوار الموقع بالإنجليزية لن يروا وصفًا لمساحتك.', 'No English description yet. Visitors using the site in English won’t see a description of your space.')}</PfLangNote>}
    </div>
  );
}
const DESC_MAX = 1000;
const PfRequired = () => <span className="text-caption text-foreground">{tr('مطلوب', 'Required')}</span>;
const pfCount = (t) => <Ltr>{t.length} / {DESC_MAX}</Ltr>;

function PfAboutSheet({ open, d, onClose, onSave }) {
  const dr = usePfDraft(open, d.about);
  const v = dr.v;
  const errs = () => ({ nameEn: !v.nameEn.trim() ? tr('أدخل الاسم بالإنجليزية', 'Enter the English name') : null });
  const e = dr.tried ? errs() : {};
  const save = (commit) => { if (!commit) { dr.setTried(true); return !errs().nameEn; } onSave({ nameAr: v.nameAr.trim(), nameEn: v.nameEn.trim(), descAr: v.descAr.trim(), descEn: v.descEn.trim() }); return true; };
  return (
    <PfSheet open={open} title={tr('تعديل: عن المساحة', 'Edit: about the space')} dirty={dr.dirty} onSave={save} onClose={onClose}>
      <div className="grid gap-4 md:grid-cols-2">
        <RField label={tr('الاسم بالعربية', 'Name in Arabic')} labelEnd={<Optional />}><RInput lang="ar" dir="rtl" autoComplete="off" value={v.nameAr} onChange={(ev) => dr.set({ nameAr: ev.target.value })} /></RField>
        <RField label={tr('الاسم بالإنجليزية', 'Name in English')} labelEnd={<PfRequired />} error={e.nameEn} helper={tr('تغيير الاسم لا يغيّر رابط صفحتك.', 'Changing the name doesn’t change your page’s link.')}><RInput lang="en" dir="ltr" autoComplete="off" value={v.nameEn} onChange={(ev) => dr.set({ nameEn: ev.target.value })} /></RField>
      </div>
      <RField label={tr('الوصف بالعربية', 'Description in Arabic')} labelEnd={<Optional />} helper={pfCount(v.descAr)}><RTextarea lang="ar" dir="rtl" rows={6} maxLength={DESC_MAX} value={v.descAr} onChange={(ev) => dr.set({ descAr: ev.target.value })} /></RField>
      <RField label={tr('الوصف بالإنجليزية', 'Description in English')} labelEnd={<Optional />} helper={pfCount(v.descEn)}><RTextarea lang="en" dir="ltr" rows={6} maxLength={DESC_MAX} value={v.descEn} onChange={(ev) => dr.set({ descEn: ev.target.value })} /></RField>
    </PfSheet>
  );
}
function PfAboutSection({ d, api, readOnly, notice, sheet, setSheet }) {
  return (
    <>
      <PfSection id="about" title={tr('عن المساحة', 'About the space')} d={d} api={api} readOnly={readOnly} notice={notice} onEdit={() => setSheet('about')}>
        <div className="grid gap-6 md:grid-cols-2">
          <PfAboutColumn lang="ar" v={d.about} />
          <PfAboutColumn lang="en" v={d.about} />
        </div>
      </PfSection>
      {!readOnly && <PfAboutSheet open={sheet === 'about'} d={d} onClose={() => setSheet(null)} onSave={(v) => api.save('about', v)} />}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// الموقع (L1–L2): the area, the address in both languages, and the pin.
// ---------------------------------------------------------------------------------------------
const pfMapsHref = (c) => 'https://www.google.com/maps/search/?api=1&query=' + c.lat + ',' + c.lng;
const pfAreaLine = (areaId) => { const a = window.MASAHA.findArea(areaId); const g = window.MASAHA.areaGov(areaId); return (a ? tr(a.ar, a.en) : '') + (g ? tr('، ', ', ') + g.name.replace('محافظة ', '') : ''); };

function PfLocationView({ v, name }) {
  const pin = parseCoords(v.coords);
  const mine = LANG === 'en' ? v.addrEn : v.addrAr;
  const other = LANG === 'en' ? v.addrAr : v.addrEn;
  const landmark = LANG === 'en' ? v.landmarkEn || v.landmarkAr : v.landmarkAr || v.landmarkEn;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-label">{pfAreaLine(v.area)}</p>
        <p className="text-body" lang={LANG === 'en' && !v.addrEn ? 'ar' : undefined}>{mine || v.addrAr}</p>
        {other && mine && <p className="text-body-sm text-muted-foreground" lang={LANG === 'en' ? 'ar' : 'en'} dir={LANG === 'en' ? 'rtl' : 'ltr'}>{other}</p>}
        {landmark && <p className="text-body-sm">{tr('علامة مميزة: ', 'Landmark: ')}{landmark}</p>}
        {!v.addrEn && <PfLangNote>{tr('العنوان بالإنجليزية لم يُضف. زوار الموقع بالإنجليزية يرون العنوان بالعربية.', 'No English address yet. Visitors using the site in English see the Arabic one.')}</PfLangNote>}
        {pin && <div><RButton variant="outline" size="sm" asChild><a href={pfMapsHref(pin)} target="_blank" rel="noopener">{tr('فتح في خرائط Google', 'Open in Google Maps')}</a></RButton></div>}
      </div>
      {pin && <SpaceMap static spaces={[{ id: 'pin', name: name, verified: true, lat: pin.lat, lng: pin.lng }]} selectedId="pin" focus={pin} label={tr('موقع المساحة على الخريطة', 'The space on the map')} className="h-48 md:h-full" />}
    </div>
  );
}

// L2: one area, searched by name, grouped by governorate.
function PfAreaCombo({ value, onChange, error }) {
  const groups = areaCatalogue();
  const chosen = groups.flatMap((g) => g.areas).find((a) => a.id === value);
  return (
    <RField label={tr('المنطقة', 'Area')} error={error}>
      <RCombobox type="single" value={value} onValueChange={onChange}>
        <RComboTrigger empty={!value}>{chosen ? chosen.name : tr('اختر المنطقة', 'Choose the area')}</RComboTrigger>
        <RComboContent searchLabel={tr('بحث', 'Search')} searchPlaceholder={tr('اسم المنطقة', 'Area name')} listLabel={tr('المناطق', 'Areas')} emptyText={tr('لا توجد منطقة بهذا الاسم', 'No area by that name')}>
          {groups.map((g) => <RComboGroup key={g.id} heading={g.name}>{g.areas.map((a) => <RComboItem key={a.id} value={a.id} keywords={[a.name, g.name]}>{a.name}</RComboItem>)}</RComboGroup>)}
        </RComboContent>
      </RCombobox>
    </RField>
  );
}

function PfLocationSheet({ open, d, onClose, onSave }) {
  const dr = usePfDraft(open, d.location);
  const v = dr.v;
  const pin = parseCoords(v.coords);
  // The sample's position; ?demo=outside puts it at sea, past the Strip's box.
  const here = (pageParams.get('demo') || '').split(',').includes('outside') ? { lat: 31.30, lng: 34.12 } : window.MASAHA.demoUser;
  const errs = () => ({ area: !v.area ? tr('اختر المنطقة', 'Choose the area') : null, addrAr: !v.addrAr.trim() ? tr('أدخل العنوان بالعربية', 'Enter the Arabic address') : null, coords: coordsError(v.coords) });
  const e = dr.tried ? errs() : { coords: v.coords && coordsError(v.coords) && parseCoords(v.coords) ? coordsError(v.coords) : null };
  const save = (commit) => { if (!commit) { dr.setTried(true); return !errorsOf(errs()); } onSave(Object.assign({}, v, { addrAr: v.addrAr.trim(), addrEn: v.addrEn.trim(), landmarkAr: v.landmarkAr.trim(), landmarkEn: v.landmarkEn.trim() })); return true; };
  const pinSpace = pin ? [{ id: 'pin', name: d.about.nameEn, verified: false, lat: pin.lat, lng: pin.lng }] : [];
  return (
    <PfSheet open={open} title={tr('تعديل الموقع', 'Edit the location')} dirty={dr.dirty} onSave={save} onClose={onClose}>
      <PfAreaCombo value={v.area} onChange={(a) => dr.set({ area: a })} error={e.area} />
      <div className="grid gap-4 md:grid-cols-2">
        <RField label={tr('العنوان بالعربية', 'Address in Arabic')} error={e.addrAr}><RInput lang="ar" dir="rtl" autoComplete="off" value={v.addrAr} onChange={(ev) => dr.set({ addrAr: ev.target.value })} /></RField>
        <RField label={tr('العنوان بالإنجليزية', 'Address in English')} labelEnd={<Optional />}><RInput lang="en" dir="ltr" autoComplete="off" value={v.addrEn} onChange={(ev) => dr.set({ addrEn: ev.target.value })} /></RField>
        <RField label={tr('علامة مميزة بالعربية', 'Landmark in Arabic')} labelEnd={<Optional />}><RInput lang="ar" dir="rtl" autoComplete="off" value={v.landmarkAr} onChange={(ev) => dr.set({ landmarkAr: ev.target.value })} /></RField>
        <RField label={tr('علامة مميزة بالإنجليزية', 'Landmark in English')} labelEnd={<Optional />}><RInput lang="en" dir="ltr" autoComplete="off" value={v.landmarkEn} onChange={(ev) => dr.set({ landmarkEn: ev.target.value })} /></RField>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-label">{tr('الموقع على الخريطة', 'Pin on the map')}</span>
          <RButton type="button" variant="outline" size="sm" onClick={() => { dr.set({ coords: fmtCoords(here) }); rtoast(tr('نُقل الدبوس إلى موقعك الحالي. عدّله إن لزم.', 'The pin moved to where you are now. Adjust it if needed.')); }}>{tr('استخدم موقعي الحالي', 'Use my current location')}</RButton>
        </div>
        <SpaceMap spaces={pinSpace} selectedId="pin" onSelect={() => {}} picking onPick={(c) => dr.set({ coords: fmtCoords(c) })} label={tr('خريطة: اضغط لوضع دبوس المساحة', 'Map: tap to place the space’s pin')} className="pf-map-lg" />
        <p className="text-caption text-muted-foreground">{tr('اضغط على الخريطة عند مدخل المساحة لوضع الدبوس، واضغط مرة أخرى لنقله.', 'Tap the map at the space’s entrance to place the pin, and tap again to move it.')}</p>
      </div>
      <RField label={tr('الإحداثيات', 'Coordinates')} error={e.coords} helper={<>{tr('طريقة لوحة المفاتيح: خط العرض ثم خط الطول، مثل ', 'The keyboard’s way: latitude, then longitude, as in ')}<Ltr>31.52, 34.45</Ltr></>}>
        <RInput dir="ltr" autoComplete="off" spellCheck={false} value={v.coords} onChange={(ev) => dr.set({ coords: ev.target.value })} />
      </RField>
    </PfSheet>
  );
}
function PfLocationSection({ d, api, readOnly, notice, sheet, setSheet }) {
  return (
    <>
      <PfSection id="location" title={tr('الموقع', 'Location')} d={d} api={api} readOnly={readOnly} notice={notice} onEdit={() => setSheet('location')}
        empty={{ text: tr('لم يُحدَّد الموقع بعد.', 'No location yet.'), action: tr('أضف الموقع', 'Add the location'), onAction: () => setSheet('location') }}>
        <PfLocationView v={d.location} name={d.about.nameEn} />
      </PfSection>
      {!readOnly && <PfLocationSheet open={sheet === 'location'} d={d} onClose={() => setSheet(null)} onSave={(v) => api.save('location', v)} />}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// التواصل (C1–C2, M3–M4): tiles like the amenities, each a working link; any contact the owner has.
// ---------------------------------------------------------------------------------------------
// [type, name, placeholder, icon]. M4 adds تيليجرام، X، لينكدإن، يوتيوب and «وسيلة أخرى» (its own name).
const PF_CONTACTS = () => [
  ['whatsapp', tr('واتساب', 'WhatsApp'), '0599123456', 'chat'],
  ['phone', tr('هاتف', 'Phone'), '0599123456', 'phone'],
  ['email', tr('بريد إلكتروني', 'Email'), 'name@example.com', 'mail'],
  ['instagram', tr('إنستغرام', 'Instagram'), tr('اسم الحساب أو الرابط', 'Account name or link'), 'camera'],
  ['facebook', tr('فيسبوك', 'Facebook'), tr('اسم الصفحة أو الرابط', 'Page name or link'), 'thumb'],
  ['telegram', tr('تيليجرام', 'Telegram'), tr('اسم الحساب أو الرابط', 'Account name or link'), 'send'],
  ['tiktok', tr('تيك توك', 'TikTok'), tr('اسم الحساب أو الرابط', 'Account name or link'), 'music'],
  ['x', tr('X (تويتر)', 'X (Twitter)'), tr('اسم الحساب أو الرابط', 'Account name or link'), 'hash'],
  ['linkedin', tr('لينكدإن', 'LinkedIn'), tr('رابط الصفحة', 'Page link'), 'briefcase'],
  ['youtube', tr('يوتيوب', 'YouTube'), tr('رابط القناة', 'Channel link'), 'play'],
  ['website', tr('موقع إلكتروني', 'Website'), 'https://…', 'globe'],
  ['other', tr('وسيلة أخرى', 'Other'), tr('الرابط أو الرقم', 'Link or number'), 'link']
];
const pfCT = (type) => PF_CONTACTS().find((c) => c[0] === type) || PF_CONTACTS()[11];
const CONTACT_LIMIT = 20;
// Each network: its hosts, and how a bare account name becomes its link.
const PF_NET = {
  instagram: [['instagram.com'], (h) => 'https://instagram.com/' + h],
  facebook: [['facebook.com', 'fb.com'], (h) => 'https://facebook.com/' + h],
  telegram: [['t.me', 'telegram.me'], (h) => 'https://t.me/' + h],
  tiktok: [['tiktok.com'], (h) => 'https://www.tiktok.com/@' + h],
  x: [['x.com', 'twitter.com'], (h) => 'https://x.com/' + h],
  linkedin: [['linkedin.com'], null],
  youtube: [['youtube.com', 'youtu.be'], (h) => 'https://www.youtube.com/@' + h]
};
const pfPhone = (t) => {
  let d = t.replace(/\(0\)/g, '').replace(/[\s\-.()]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  if (/^\+97[02]5[69]\d{7}$/.test(d)) d = '+970' + d.slice(4);
  else if (/^05[69]\d{7}$/.test(d)) d = '+970' + d.slice(1);
  else if (/^05\d{8}$/.test(d)) d = '+972' + d.slice(1);
  else if (/^0\d{8}$/.test(d)) d = '+970' + d.slice(1);
  return /^\+97[02]\d{8,9}$/.test(d) ? d : '';
};
const pfUrl = (t) => { const u = /^https?:\/\//i.test(t) ? t : 'https://' + t; return /^https?:\/\/[^\s/]+\.[^\s/]+/i.test(u) && !/\s/.test(u) ? u.replace(/^https?:\/\/([^/]+)/i, (m, h) => 'https://' + h.toLowerCase()) : ''; };
// The value in its one stored form (as today: Arabic-Indic digits, long Facebook links): null when
// empty, '' when it is not one of this type's.
function pfStored(type, raw) {
  const t = latinDigits((raw || '').trim());
  if (!t) return null;
  if (type === 'whatsapp' || type === 'phone') return pfPhone(t);
  if (type === 'email') return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t) ? t.toLowerCase() : '';
  if (type === 'website') return pfUrl(t);
  if (type === 'other') return /^[+\d][\d\s\-().]{6,}$/.test(t) ? pfPhone(t) || t.replace(/\s/g, '') : pfUrl(t);
  const [hosts, from] = PF_NET[type];
  if (/\//.test(t) || /\.(com|be|me)$/i.test(t)) {
    const m = t.replace(/^https?:\/\//i, '').match(/^(?:www\.|m\.|web\.)?([^/]+)\/([^#]+)/i);
    if (!m || !hosts.includes(m[1].toLowerCase())) return '';
    // A long Facebook link keeps its page id only; any other link drops its query.
    const path = /^profile\.php\?id=\d+/.test(m[2]) ? m[2].match(/^profile\.php\?id=\d+/)[0] : m[2].split('?')[0].replace(/\/$/, '');
    return path ? 'https://' + (type === 'tiktok' || type === 'youtube' || type === 'linkedin' ? 'www.' : '') + m[1].toLowerCase() + '/' + path : '';
  }
  if (!from) return '';
  const h = t.replace(/^@/, '');
  return /^[\w.]+$/.test(h) ? from(h) : '';
}
// What a tile shows and where it leads.
const pfContactHref = (type, s) => (type === 'whatsapp' ? 'https://wa.me/' + s.replace(/\D/g, '') : type === 'phone' || (type === 'other' && /^\+?\d+$/.test(s)) ? 'tel:' + s : type === 'email' ? 'mailto:' + s : s);
const pfContactShown = (type, s) => {
  if (type === 'whatsapp' || type === 'phone' || type === 'email') return s;
  const m = s.match(/^https:\/\/(?:www\.)?([^/]+)\/(.+)$/);
  if (m && PF_NET[type] && PF_NET[type][1] && /^@?[\w.]+$/.test(m[2])) return '@' + m[2].replace(/^@/, '');
  return s.replace(/^https?:\/\/(www\.)?/, '');
};
const pfContactName = (c) => (c.type === 'other' ? c.label || tr('وسيلة أخرى', 'Other') : pfCT(c.type)[1]);

function PfContactsView({ list }) {
  return (
    <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
      {list.map((c) => {
        const s = pfStored(c.type, c.value) || c.value;
        const href = pfContactHref(c.type, s);
        const web = /^https:/.test(href);
        return (
          <li key={c.id} className="min-w-0">
            <a href={href} target={web ? '_blank' : undefined} rel={web ? 'noopener' : undefined} className="pf-tile-link flex min-w-0 items-center gap-3 rounded-lg bg-muted px-3 py-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card"><PfIcon name={pfCT(c.type)[3]} /></span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-label">{pfContactName(c)}</span>
                <span dir="ltr" className="truncate text-caption text-muted-foreground">{pfContactShown(c.type, s)}</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

const PF_BAD = () => ({ whatsapp: tr('رقم الواتساب غير صحيح', 'Not a valid WhatsApp number'), phone: tr('رقم الهاتف غير صحيح', 'Not a valid phone number'), email: tr('البريد الإلكتروني غير صحيح', 'Not a valid email'), linkedin: tr('رابط الصفحة غير صحيح', 'Not a valid page link'), youtube: tr('اسم القناة أو رابطها غير صحيح', 'Not a valid channel name or link'), website: tr('الرابط غير صحيح', 'Not a valid link'), other: tr('اكتب رابطًا أو رقمًا صحيحًا', 'Enter a valid link or number') });
function pfContactErrors(list) {
  const out = {}; const seen = new Set();
  list.forEach((c) => {
    if (c.type === 'other' && !(c.label || '').trim()) { out[c.id + '-label'] = tr('اكتب اسم الوسيلة', 'Enter the contact’s name'); }
    const s = pfStored(c.type, c.value);
    if (s === null) out[c.id] = tr('املأ القيمة أو احذف هذه الوسيلة', 'Fill in the value, or remove this contact');
    else if (s === '') out[c.id] = PF_BAD()[c.type] || tr('اسم الحساب أو الرابط غير صحيح', 'Not a valid account name or link');
    else if (seen.has(c.type + s)) out[c.id] = tr('هذه الوسيلة مضافة من قبل', 'This contact is already added');
    if (s) seen.add(c.type + s);
  });
  return out;
}

function PfContactsSheet({ open, d, onClose, onSave }) {
  const start = d.contacts.length ? d.contacts : [{ id: 'n0', type: 'whatsapp', value: '' }];
  const dr = usePfDraft(open, { list: start });
  const list = dr.v.list;
  const [armed, setArmed] = React.useState(null);
  const e = dr.tried ? pfContactErrors(list) : {};
  const setC = (id, p) => dr.setV((x) => ({ list: x.list.map((c) => (c.id === id ? Object.assign({}, c, p) : c)) }));
  const byId = Object.fromEntries(list.map((c) => [c.id, c]));
  const sort = usePfReorder({ ids: list.map((c) => c.id), nameOf: (id) => pfContactName(byId[id]), onChange: (ids) => dr.setV((x) => ({ list: ids.map((id) => x.list.find((c) => c.id === id)) })), onDrop: () => {} });
  const save = (commit) => { if (!commit) { dr.setTried(true); return !Object.keys(pfContactErrors(list)).length; } onSave(list.map((c) => Object.assign({}, c, { value: pfStored(c.type, c.value) }, c.type === 'other' ? { label: c.label.trim() } : {}))); return true; };
  const add = () => { const id = 'n' + Date.now(); dr.setV((x) => ({ list: x.list.concat([{ id, type: 'whatsapp', value: '' }]) })); setTimeout(() => { const el = document.querySelector('[data-contact="' + id + '"] input'); if (el) el.focus(); }); };
  return (
    <PfSheet open={open} title={tr('تعديل التواصل', 'Edit the contacts')} description={tr('الأولى تظهر أولًا للزوار.', 'The first shows first to visitors.')} dirty={dr.dirty} onSave={save} onClose={onClose}>
      {list.length > 1 && <p className="text-body-sm text-muted-foreground" id="pf-contact-hint">{tr('اسحب المقبض لترتيب الوسائل. بلوحة المفاتيح: اختر المقبض، اضغط مسافة، حرّكها بالسهمين، ثم مسافة.', 'Drag the handle to order the contacts. With the keyboard: focus the handle, press Space, move it with the arrow keys, then Space.')}</p>}
      <p className="sr-only" aria-live="assertive">{sort.said}</p>
      <ul className="flex flex-col gap-3">
        {list.map((c, i) => {
          const s = pfStored(c.type, c.value);
          const other = c.type === 'other';
          const props = sort.itemProps(c.id);
          return (
            <li key={c.id} {...props} draggable={armed === c.id} onDragEnd={(ev) => { setArmed(null); props.onDragEnd(ev); }} data-contact={c.id} className={'pf-contact-row rounded-lg border border-border p-3 ' + (other ? 'pf-other' : '')}>
              <button type="button" data-handle="" className="pf-handle flex items-center justify-center rounded-md text-muted-foreground" aria-label={tr('ترتيب ', 'Reorder ') + pfContactName(c) + tr(`، المكان ${i + 1} من ${list.length}`, `, position ${i + 1} of ${list.length}`)} aria-describedby={list.length > 1 ? 'pf-contact-hint' : undefined}
                onMouseDown={() => setArmed(c.id)} onMouseUp={() => setArmed(null)} onKeyDown={sort.key(c.id)} onClick={(ev) => ev.preventDefault()}>
                <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
              </button>
              <div className="pf-cell-type">
                <RField label={tr('النوع', 'Type')}>
                  <RSelect value={c.type} onValueChange={(t) => setC(c.id, { type: t })}>
                    <RTrigger className="w-full"><RValue /></RTrigger>
                    <RContent>{PF_CONTACTS().map(([t, n, , icon]) => <RItem key={t} value={t}><span className="flex items-center gap-2"><PfIcon name={icon} className="size-4 shrink-0 text-primary" />{n}</span></RItem>)}</RContent>
                  </RSelect>
                </RField>
              </div>
              {other && <div className="pf-cell-label"><RField label={tr('اسم الوسيلة', 'Name')} error={e[c.id + '-label']}><RInput dir="auto" placeholder={tr('مثلًا: ديسكورد', 'e.g. Discord')} value={c.label || ''} onChange={(ev) => setC(c.id, { label: ev.target.value })} /></RField></div>}
              <div className="pf-cell-value">
                <RField label={other ? tr('الرابط أو الرقم', 'Link or number') : pfCT(c.type)[1]} error={e[c.id]} helper={s && s !== c.value.trim() ? <>{tr('يُحفظ كـ ', 'Saved as ')}<Ltr>{s}</Ltr></> : undefined}>
                  <RInput dir="ltr" autoComplete="off" spellCheck={false} placeholder={pfCT(c.type)[2]} value={c.value} onChange={(ev) => setC(c.id, { value: ev.target.value })} />
                </RField>
              </div>
              <PfRemove label={tr('حذف ', 'Remove ') + pfContactName(c)} onClick={() => dr.setV((x) => ({ list: x.list.filter((y) => y.id !== c.id) }))} />
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <RButton type="button" variant="outline" disabled={list.length >= CONTACT_LIMIT} onClick={add}>{tr('إضافة وسيلة تواصل', 'Add a contact')}</RButton>
        {list.length >= CONTACT_LIMIT && <LimitNote>{tr('الحد 20 وسيلة', 'Up to 20 contacts')}</LimitNote>}
      </div>
    </PfSheet>
  );
}
function PfContactsSection({ d, api, readOnly, notice, sheet, setSheet }) {
  return (
    <>
      <PfSection id="contacts" title={tr('التواصل', 'Contacts')} d={d} api={api} readOnly={readOnly} notice={notice} onEdit={() => setSheet('contacts')}
        empty={{ text: tr('لم تُضف وسائل تواصل بعد. الزوار لن يجدوا طريقة للتواصل معك.', 'No contacts yet. Visitors won’t find a way to reach you.'), action: tr('أضف وسيلة تواصل', 'Add a contact'), onAction: () => setSheet('contacts') }}>
        <PfContactsView list={d.contacts} />
      </PfSection>
      {!readOnly && <PfContactsSheet open={sheet === 'contacts'} d={d} onClose={() => setSheet(null)} onSave={(l) => api.save('contacts', l)} />}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// The page body both editors render (G5): the header, the index, the eight sections.
// `admin`: { verified, hidden } on the admin's page; `readOnly`: a verified space there.
// `notice(id)`: a visitor's report on that section, shown inside it (G3).
// ---------------------------------------------------------------------------------------------
const PF_SHEETS = ['prices', 'hours', 'shifts', 'amenities', 'about', 'location', 'contacts'];
function SpaceProfile({ initial, readOnly, admin, publicHref, closureHref, notice, manage, retired, pkgShifts, after }) {
  const [d, api] = usePfStore(initial);
  const [sheet, setSheetState] = React.useState(() => (readOnly ? null : PF_SHEETS.includes(pageParams.get('sheet')) ? pageParams.get('sheet') : null));
  const [editing, setEditing] = React.useState(() => !readOnly && pageParams.get('photos') === 'edit');
  const setSheet = (k) => setSheetState(k);
  // A frame opened on a Sheet or on the photos' edit state lands on its section.
  React.useEffect(() => { const k = pageParams.get('photos') === 'edit' ? 'photos' : pageParams.get('sheet'); if (k) setTimeout(() => { const el = document.getElementById(k); if (el) el.scrollIntoView({ block: 'start' }); }, 80); }, []);
  const used = d.prices.map((r) => r.shift).filter((x) => x && x !== 'none').concat(pkgShifts || []);
  const n = notice || (() => null);
  const common = { d, api, readOnly, sheet, setSheet };
  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
      <PfIndex d={d} />
      <div className="flex min-w-0 flex-col gap-6 lg:col-span-9">
        <PfHeader d={d} admin={admin} publicHref={publicHref} readOnly={readOnly} onAddCover={() => setEditing(true)} />
        <PfPhotosSection d={d} api={api} readOnly={readOnly} editing={editing} setEditing={setEditing} />
        <PfPricesSection {...common} notice={n('prices')} owner={!admin} />
        <PfHoursSection {...common} notice={n('hours')} closureHref={closureHref} />
        <PfShiftsSection {...common} used={used} />
        <PfAmenitiesSection {...common} notice={n('amenities')} retired={retired} manage={manage} />
        <PfAboutSection {...common} notice={n('about')} />
        <PfLocationSection {...common} notice={n('location')} />
        <PfContactsSection {...common} notice={n('contacts')} />
        {after}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// The sample a page starts from: a space's facts in the profile's shape.
// ---------------------------------------------------------------------------------------------
const pfDemo = (k) => (pageParams.get('demo') || '').split(',').includes(k);
// A group: its age, stale past its threshold (30 days for the prices, 60 for the others, DI-14),
// or never saved.
const pfGroup = (days, g, limit) => (days == null ? { days: null, missing: true, stale: false } : { days, stale: days > (g === 'prices' ? limit.prices : limit.other) });
const pfPriceRows = (space) => {
  const rows = space.priceRows || ['hour', 'day', 'week', 'month'].filter((k) => space.prices && space.prices[k] != null).map((k) => ({ period: k, audience: 'general', amount: space.prices[k] }));
  const out = rows.map((r) => ({ period: r.period, audience: r.audience === 'student' ? 'students' : 'all', shift: r.shift || 'none', amount: String(r.amount), label: r.label }));
  if (space.studentMonth && !out.some((r) => r.audience === 'students' && r.period === 'month')) out.push({ period: 'month', audience: 'students', shift: 'none', amount: String(space.studentMonth) });
  if (space.shiftPrices) Object.entries(space.shiftPrices).forEach(([shift, ps]) => ['hour', 'day', 'week', 'month'].forEach((k) => ps[k] != null && out.push({ period: k, audience: 'all', shift, amount: String(ps[k]) })));
  return out.map((r, i) => Object.assign({ id: 'r' + i }, r));
};
const pfPhotos = (count, seed) => Array.from({ length: count }, (_, i) => ({ id: 'p' + (i + 1), n: i + 1, seed: i === 0 ? seed : seed + (i + 1), state: 'done' }));
const pfContacts = (list) => list.map((c, i) => Object.assign({ id: 'c' + i }, c, { type: { jawwal: 'phone', ooredoo: 'phone' }[c.type] || c.type }));

function pfSample({ space, profile, groups, limit, extra }) {
  const x = extra || {};
  const p = profile || sampleProfile(space);
  const missing = (g) => groups[g] == null;
  const hours = x.hours !== undefined ? x.hours : space.hours || null;
  return {
    groups: Object.fromEntries(FACT_GROUPS.map((g) => [g, pfGroup(groups[g], g, limit)])),
    photos: pfPhotos(x.photos != null ? x.photos : space.photos || 0, space.id || 'space'),
    prices: missing('prices') ? [] : x.prices || pfPriceRows(space),
    hours: missing('hours') ? null : hours,
    shifts: missing('hours') ? [] : x.shifts || (space.shifts || []).map((s) => ({ id: s.id, ar: s.long, en: s.long, from: s.range[0], to: s.range[1] })),
    amenities: missing('amenities') ? { list: [], own: [] } : { list: (x.amenities || space.amenities || []).slice(), own: (x.own || space.ownAmenities || []).map((o) => ({ ar: o.ar, en: o.en || '' })) },
    about: { nameAr: p.nameAr || '', nameEn: p.nameEn || '', descAr: x.descAr != null ? x.descAr : p.descAr || '', descEn: x.descEn != null ? x.descEn : p.descEn || '' },
    location: { area: p.area || '', addrAr: p.addrAr || '', addrEn: p.addrEn || '', landmarkAr: p.landmarkAr || '', landmarkEn: p.landmarkEn || '', coords: p.coords || '' },
    contacts: missing('contacts') ? [] : pfContacts(x.contacts || space.contacts || [])
  };
}

Object.assign(window, { SpaceProfile, pfSample, pfDemo, pfGroup, pfPriceRows, PF_CONTACTS, pfStored, pfContactHref, PfLangNote, CONTACT_LIMIT });
