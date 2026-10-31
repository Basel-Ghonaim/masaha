import { useCopy } from '@shared/copy';
import { setTheme, THEME_CHOICES, usePreferences, type ThemeChoice } from '@shared/preferences';

/**
 * «المظهر»: light, dark or the device's setting (`system`, the default), on this device only, as the
 * headers' toggle is (DI20): never sent to the account.
 */
export function useThemeChoice() {
  const words = useCopy().users.settings.preferences;
  const value = usePreferences((preferences) => preferences.themeChoice);

  return {
    label: words.theme,
    helper: words.themeHelper,
    value,
    options: THEME_CHOICES.map((choice) => ({ value: choice, label: words.themes[choice] })),
    choose: (choice: ThemeChoice) => {
      setTheme(choice);
    },
  };
}
