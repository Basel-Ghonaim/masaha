import { DirectionProvider } from '@shared/design-system';
import { useLayoutEffect } from 'react';
import { useSearchParams } from 'react-router';
import fixtures from './fixtures.json';
import {
  ButtonSection,
  CheckboxSection,
  FieldSection,
  IconsSection,
  InputSection,
  RadioGroupSection,
  SwitchSection,
  TextareaSection,
} from './sections';
import { readSettings } from './settings';

/**
 * Every section in one theme and one language: the page inside the showcase's iframe. Like the app,
 * it sets data-theme, lang and dir on <html>, so content portalled to <body> (menus, dialogs)
 * matches too. Each component adds its section below.
 */
export function ShowcasePreview() {
  const [params] = useSearchParams();
  const { theme, language } = readSettings(params);
  const direction = language === 'ar' ? 'rtl' : 'ltr';
  const samples = fixtures.samples[language];

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.lang = language;
    root.dir = direction;
  }, [theme, language, direction]);

  return (
    <DirectionProvider dir={direction}>
      <main className="flex flex-col gap-12 p-6">
        <IconsSection samples={samples.icons} />
        <ButtonSection samples={samples.button} />
        <FieldSection samples={samples.field} />
        <InputSection samples={samples.input} />
        <TextareaSection samples={samples.textarea} />
        <CheckboxSection samples={samples.checkbox} />
        <RadioGroupSection samples={samples.radioGroup} />
        <SwitchSection samples={samples.switch} />
      </main>
    </DirectionProvider>
  );
}
