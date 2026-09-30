// Language + theme come from the URL (?lang=en, ?theme=dark) and are carried on every internal link.
(function () {
  const p = new URLSearchParams(location.search);
  const lang = p.get('lang') === 'en' ? 'en' : 'ar';
  const dir = lang === 'en' ? 'ltr' : 'rtl';
  const root = document.documentElement;
  root.lang = lang; root.dir = dir;
  if (p.get('theme') === 'dark') root.dataset.theme = 'dark';
  window.LANG = lang; window.DIR = dir;
  window.tr = (ar, en) => (lang === 'en' ? en : ar);
  window.switchLang = () => { const q = new URLSearchParams(location.search); lang === 'en' ? q.delete('lang') : q.set('lang', 'en'); location.search = q.toString(); };
  const carry = (href) => {
    if (!href || /^(https?:|mailto:|tel:|#)/.test(href) || !/\.html/.test(href)) return href;
    const [path, hash] = href.split('#');
    const [base, qs] = path.split('?');
    const q = new URLSearchParams(qs || '');
    if (lang === 'en' && !q.has('lang')) q.set('lang', 'en');
    if (root.dataset.theme === 'dark' && !q.has('theme')) q.set('theme', 'dark');
    const s = q.toString();
    return base + (s ? '?' + s : '') + (hash ? '#' + hash : '');
  };
  window.carryParams = carry;
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a) a.setAttribute('href', carry(a.getAttribute('href')));
  }, true);
})();
