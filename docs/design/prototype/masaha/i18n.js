// Language + theme come from the URL (?lang=en, ?theme=dark) and are carried on every internal link.
(function () {
  const p = new URLSearchParams(location.search);
  const lang = p.get('lang') === 'en' ? 'en' : 'ar';
  const dir = lang === 'en' ? 'ltr' : 'rtl';
  const root = document.documentElement;
  root.lang = lang; root.dir = dir;
  if (p.get('theme') === 'dark') root.dataset.theme = 'dark';
  // The identity (2026-11-12): ink + berry (slate-berry) is the default, as production takes it (ADR 0019).
  // ?identity=sea gives Sea, the first identity (the bundle's own tokens: no data-identity); ?identity=slate-coral
  // the trial's other candidate (masaha/identity-ink-spark.css). None, or an unknown one, is berry. A link
  // carries the identity only when it is not the default.
  const DEFAULT_IDENTITY = 'slate-berry';
  const chosen = ['sea', 'slate-coral', 'slate-berry'].includes(p.get('identity')) ? p.get('identity') : DEFAULT_IDENTITY;
  const identity = chosen === 'sea' ? null : chosen;
  if (identity) root.dataset.identity = identity;
  // The tab's icon is the identity's small mark, light or dark as the browser's own scheme (the tab is the
  // browser's, not the page's theme).
  const icon = identity && document.querySelector('link[rel=icon]');
  if (icon) icon.href = 'masaha/logo/masaha-mark' + (matchMedia('(prefers-color-scheme: dark)').matches ? '-dark' : '') + (identity === 'slate-berry' ? '-berry' : '') + '.svg';
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
    if (chosen !== DEFAULT_IDENTITY && !q.has('identity')) q.set('identity', chosen);
    const s = q.toString();
    return base + (s ? '?' + s : '') + (hash ? '#' + hash : '');
  };
  window.carryParams = carry;
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (a) a.setAttribute('href', carry(a.getAttribute('href')));
  }, true);
})();
