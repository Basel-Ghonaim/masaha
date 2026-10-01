import { DirectionProvider, Toaster } from '@shared/design-system';
import { Fragment, useLayoutEffect } from 'react';
import { Navigate, useLocation, useParams, useSearchParams } from 'react-router';
import fixtures from './fixtures.json';
import { SHOWCASE_ROOT, resolveView } from './registry';
import { readSettings } from './settings';

/**
 * The sections of one view in one theme and one language: the page inside the showcase's iframe.
 * Like the app, it sets data-theme, lang and dir on <html>, so content portalled to <body> (menus,
 * dialogs) matches too. The registry decides which sections a view shows.
 */
export function ShowcasePreview() {
  const [params] = useSearchParams();
  const { category, entry } = useParams();
  const { search } = useLocation();
  const view = resolveView(category, entry);
  const { theme, language } = readSettings(params);
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const samples = fixtures.samples[language];

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.lang = language;
    root.dir = direction;
  }, [theme, language, direction]);

  if (view === null)
    return <Navigate to={{ pathname: `${SHOWCASE_ROOT}/preview`, search }} replace />;

  return (
    <DirectionProvider dir={direction}>
      <main className="flex flex-col gap-12 p-6">
        {view.entries.map((item) => (
          <Fragment key={item.slug}>{item.render({ samples, language })}</Fragment>
        ))}
      </main>
      <Toaster label={samples.toaster.label} closeLabel={samples.toaster.closeLabel} />
    </DirectionProvider>
  );
}
