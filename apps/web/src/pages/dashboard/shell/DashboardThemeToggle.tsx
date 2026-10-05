import { useCopy } from '@shared/copy';
import { ThemeToggle } from '@shared/design-system';
import { setTheme, usePreferences } from '@shared/preferences';

/** The layer's theme toggle, wired to the preferences: it chooses the opposite of the theme shown. */
export function DashboardThemeToggle() {
  const copy = useCopy();
  const theme = usePreferences((preferences) => preferences.theme);

  return (
    <ThemeToggle
      theme={theme}
      onThemeChange={setTheme}
      label={copy.preferences.switchTheme[theme]}
    />
  );
}
