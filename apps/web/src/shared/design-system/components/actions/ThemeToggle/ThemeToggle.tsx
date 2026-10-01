import type { ComponentProps } from 'react';
import { MoonIcon, SunIcon } from '../../../icons';
import { Button } from '../Button';

type Theme = 'light' | 'dark';

export type ThemeToggleProps = Omit<
  ComponentProps<'button'>,
  'children' | 'type' | 'onClick' | 'aria-label'
> & {
  theme: Theme;
  /** Receives the other theme. Storing and applying it is the app's policy, not the toggle's. */
  onThemeChange: (theme: Theme) => void;
  /**
   * The accessible name for what a press does now, chosen by the caller for the current theme:
   * "Dark theme" in the light theme, "Light theme" in the dark one.
   */
  label: string;
};

/** An icon button that switches between the light and dark themes, showing the one it switches to. */
export function ThemeToggle({ theme, onThemeChange, label, ...props }: ThemeToggleProps) {
  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={() => {
        onThemeChange(next);
      }}
      {...props}
    >
      {next === 'dark' ? <MoonIcon aria-hidden /> : <SunIcon aria-hidden />}
    </Button>
  );
}
