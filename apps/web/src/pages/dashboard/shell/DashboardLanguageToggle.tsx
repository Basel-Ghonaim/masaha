import { CATALOGUES } from '@shared/copy';
import { LanguageToggle } from '@shared/design-system';
import { otherLanguage, setLanguage, usePreferences } from '@shared/preferences';

/** The layer's language toggle, wired to the preferences: it offers the other language. */
export function DashboardLanguageToggle({ className }: { className: string }) {
  const other = otherLanguage(usePreferences((preferences) => preferences.language));

  return (
    <LanguageToggle
      className={className}
      lang={other}
      label={CATALOGUES[other].preferences.languageName}
      onClick={() => {
        setLanguage(other);
      }}
    />
  );
}
