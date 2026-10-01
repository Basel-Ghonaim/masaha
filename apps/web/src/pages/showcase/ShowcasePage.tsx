import {
  Button,
  MenuIcon,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  cn,
} from '@shared/design-system';
import { useState, type ReactNode } from 'react';
import { Navigate, useHref, useLocation, useParams, useSearchParams } from 'react-router';
import fixtures from './fixtures.json';
import { SHOWCASE_ROOT, resolveView, viewSegments, type ShowcaseView } from './registry';
import { ShowcaseNav } from './ShowcaseNav';
import {
  LANGUAGES,
  THEMES,
  WIDTHS,
  readSettings,
  toLanguage,
  toTheme,
  toWidth,
  type Settings,
  type Width,
} from './settings';

const { toolbar } = fixtures;

// Tailwind finds classes by scanning the source, so each width's class is written out in full.
const FRAME_WIDTH: Record<Width, string> = { '360': 'w-90', '768': 'w-192', '1280': 'w-320' };

type ToolbarSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
};

function ToolbarSelect({ label, value, onChange, children }: ToolbarSelectProps) {
  return (
    <label className="flex flex-col gap-1 text-label">
      {label}
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="rounded-md border border-input bg-background px-3 py-2 text-body text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {children}
      </select>
    </label>
  );
}

// The frame is named by what it shows: an entry or a category by its identifier, as the navigation
// names them.
function frameTitle(view: ShowcaseView | null) {
  if (view?.kind === 'entry') return view.entry.name;
  if (view?.kind === 'category') return view.category;
  return toolbar.frame;
}

/**
 * The showcase: a toolbar, the navigation, and the preview of the chosen view in an iframe of the
 * chosen width, so breakpoints respond as they would on a device that wide. Changing the view, the
 * theme or the language reloads the frame. On a phone the navigation is a drawer.
 */
export function ShowcasePage() {
  const [params, setParams] = useSearchParams();
  const { category, entry } = useParams();
  const { search } = useLocation();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const view = resolveView(category, entry);
  const settings = readSettings(params);
  const previewHref = useHref({
    pathname: `${SHOWCASE_ROOT}/preview${viewSegments(view)}`,
    search: `?theme=${settings.theme}&lang=${settings.language}`,
  });

  if (view === null) return <Navigate to={{ pathname: SHOWCASE_ROOT, search }} replace />;

  const update = (change: Partial<Settings>) => {
    const next = { ...settings, ...change };
    setParams({ theme: next.theme, lang: next.language, width: next.width }, { replace: true });
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex flex-wrap items-end gap-4 border-b border-border bg-card p-4 text-card-foreground">
        <div className="me-auto flex items-center gap-2">
          <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={toolbar.openNavigation}
                className="md:hidden"
              >
                <MenuIcon aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="start"
              closeLabel={toolbar.closeNavigation}
              aria-describedby={undefined}
            >
              <SheetHeader>
                <SheetTitle>{toolbar.navigation}</SheetTitle>
              </SheetHeader>
              <SheetBody className="px-0">
                <ShowcaseNav
                  label={toolbar.navigation}
                  allLabel={toolbar.all}
                  search={search}
                  onNavigate={() => {
                    setNavigationOpen(false);
                  }}
                />
              </SheetBody>
            </SheetContent>
          </Sheet>
          <h1 className="text-heading-3">{toolbar.heading}</h1>
        </div>
        <ToolbarSelect
          label={toolbar.theme}
          value={settings.theme}
          onChange={(value) => {
            update({ theme: toTheme(value) });
          }}
        >
          {THEMES.map((theme) => (
            <option key={theme} value={theme}>
              {toolbar.themes[theme]}
            </option>
          ))}
        </ToolbarSelect>
        <ToolbarSelect
          label={toolbar.direction}
          value={settings.language}
          onChange={(value) => {
            update({ language: toLanguage(value) });
          }}
        >
          {LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {toolbar.languages[language]}
            </option>
          ))}
        </ToolbarSelect>
        <ToolbarSelect
          label={toolbar.width}
          value={settings.width}
          onChange={(value) => {
            update({ width: toWidth(value) });
          }}
        >
          {WIDTHS.map((width) => (
            <option key={width} value={width}>
              {toolbar.widths[width]}
            </option>
          ))}
        </ToolbarSelect>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 overflow-y-auto border-e border-border bg-card text-card-foreground md:block">
          <ShowcaseNav label={toolbar.navigation} allLabel={toolbar.all} search={search} />
        </aside>
        <main className="min-w-0 flex-1 overflow-auto bg-muted p-4">
          <iframe
            src={previewHref}
            title={frameTitle(view)}
            className={cn(
              'mx-auto block h-full max-w-none border border-border bg-background',
              FRAME_WIDTH[settings.width],
            )}
          />
        </main>
      </div>
    </div>
  );
}
