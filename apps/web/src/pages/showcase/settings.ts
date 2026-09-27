export const THEMES = ['light', 'dark'] as const;
export const LANGUAGES = ['ar', 'en'] as const;
export const WIDTHS = ['360', '768', '1280'] as const;

export type Theme = (typeof THEMES)[number];
export type Language = (typeof LANGUAGES)[number];
export type Width = (typeof WIDTHS)[number];

export type Settings = { theme: Theme; language: Language; width: Width };

function pick<T extends string>(allowed: readonly T[], value: string | null | undefined): T | null {
  return allowed.find((option) => option === value) ?? null;
}

export const toTheme = (value: string) => pick(THEMES, value) ?? 'light';
export const toLanguage = (value: string) => pick(LANGUAGES, value) ?? 'ar';
export const toWidth = (value: string) => pick(WIDTHS, value) ?? '1280';

/**
 * The showcase settings in the URL, so a reload keeps them. A missing or unknown value falls back
 * to what <html> shows now (the pre-paint result), and the width to desktop.
 */
export function readSettings(params: URLSearchParams): Settings {
  const root = document.documentElement;
  return {
    theme: pick(THEMES, params.get('theme')) ?? toTheme(root.dataset.theme ?? ''),
    language: pick(LANGUAGES, params.get('lang')) ?? toLanguage(root.lang),
    width: toWidth(params.get('width') ?? ''),
  };
}
