// Imported by every preview: sets the document up as the app's pre-paint script does
// (apps/web/index.html). The tokens resolve only under data-theme, the font stacks only under
// lang, and menus and dialogs portal to <body>, so the attributes belong on <html>, not a wrapper.
// The previews show the product's primary resolution: Arabic, right to left, light.
const root = document.documentElement;
root.lang = 'ar';
root.dir = 'rtl';
root.dataset.theme = 'light';
