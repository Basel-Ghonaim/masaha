import './_document';
import { ThemeToggle } from '@masaha/design-system';
import { useState } from 'react';

// Ported from the showcase's TogglesSection (apps/web/src/pages/showcase/sections/TogglesSection.tsx).
// The toggle shows the theme it switches to: the moon in the light theme, the sun in the dark one.
// Applying the theme is the app's policy; here each toggle keeps its own state.

const TO_DARK = 'الانتقال إلى الوضع الداكن للواجهة';
const TO_LIGHT = 'الانتقال إلى الوضع الفاتح للواجهة';

export function InLightTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  return (
    <div className="flex w-full max-w-80 items-center gap-3 rounded-lg border bg-background px-4 py-2">
      <span className="flex-1 text-label">مساحة</span>
      <ThemeToggle
        theme={theme}
        onThemeChange={setTheme}
        label={theme === 'dark' ? TO_LIGHT : TO_DARK}
      />
    </div>
  );
}

// In the dark theme, scoped to this cell with data-theme as the app sets it on <html>.
export function InDarkTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  return (
    <div
      data-theme="dark"
      className="flex w-full max-w-80 items-center gap-3 rounded-lg border bg-background px-4 py-2 text-foreground"
    >
      <span className="flex-1 text-label">مساحة</span>
      <ThemeToggle
        theme={theme}
        onThemeChange={setTheme}
        label={theme === 'dark' ? TO_LIGHT : TO_DARK}
      />
    </div>
  );
}
