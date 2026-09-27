import { LanguageToggle, ThemeToggle } from '@shared/design-system';
import { useState } from 'react';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';
import type { Language } from '../settings';

type TogglesSamples = {
  title: string;
  themeCaption: string;
  languageCaption: string;
  toDark: string;
  toLight: string;
  otherLanguage: string;
};

/**
 * The toggles only report a choice; applying it is the app's policy. Here the theme toggle keeps
 * its own state, and the language toggle does nothing, so the preview stays as the toolbar sets it.
 */
export function TogglesSection({
  samples,
  otherLanguage,
}: {
  samples: TogglesSamples;
  otherLanguage: Language;
}) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.themeCaption}>
        <ThemeToggle
          theme={theme}
          onThemeChange={setTheme}
          label={theme === 'dark' ? samples.toLight : samples.toDark}
        />
        <ThemeToggle theme="dark" onThemeChange={setTheme} label={samples.toLight} />
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.languageCaption}>
        <LanguageToggle lang={otherLanguage} label={samples.otherLanguage} />
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
