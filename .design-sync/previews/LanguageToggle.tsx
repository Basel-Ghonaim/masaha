import './_document';
import { LanguageToggle, ThemeToggle } from '@masaha/design-system';

// Ported from the showcase's TogglesSection (apps/web/src/pages/showcase/sections/TogglesSection.tsx).
// It offers the other language by its own name, marked with that language. Switching is the app's
// policy: the button only reports the click.

export function OtherLanguage() {
  return <LanguageToggle lang="en" label="English version" />;
}

// Where it sits in the app: the header's end, beside the theme toggle.
export function InHeader() {
  return (
    <div className="flex w-full max-w-120 items-center gap-2 rounded-lg border bg-background px-4 py-2">
      <span className="flex-1 text-label">مساحة</span>
      <LanguageToggle lang="en" label="English version" />
      <ThemeToggle
        theme="light"
        onThemeChange={() => {}}
        label="الانتقال إلى الوضع الداكن للواجهة"
      />
    </div>
  );
}
