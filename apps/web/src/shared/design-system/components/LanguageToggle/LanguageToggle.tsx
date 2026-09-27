import type { ComponentProps } from 'react';
import { LanguagesIcon } from '../../icons';
import { Button } from '../Button';

export type LanguageToggleProps = Omit<ComponentProps<'button'>, 'children' | 'type' | 'lang'> & {
  /** The language the button switches to, as a language tag (`en`, `ar`). */
  lang: string;
  /** That language's name in its own words: «English», «العربية» (docs/frontend/localisation.md). */
  label: string;
};

/**
 * A button that offers the other language by its own name. The name is marked with its language
 * and isolated, so it is pronounced and ordered correctly inside the current one. Switching is the
 * app's policy: the button only reports the click.
 */
export function LanguageToggle({ lang, label, ...props }: LanguageToggleProps) {
  return (
    <Button type="button" variant="ghost" {...props}>
      <LanguagesIcon aria-hidden />
      <bdi lang={lang}>{label}</bdi>
    </Button>
  );
}
