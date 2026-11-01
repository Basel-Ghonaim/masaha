import { useCopy } from '@shared/copy';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  ToggleGroup,
  ToggleGroupItem,
} from '@shared/design-system';
import { useLanguageChoice } from '../../hooks/settings/useLanguageChoice';
import { useThemeChoice } from '../../hooks/settings/useThemeChoice';

/**
 * «التفضيلات», applied right away: the language, saved to the account (`useLanguageChoice`), and
 * the theme, kept on this device (`useThemeChoice`), each one choice of a group.
 */
export function PreferencesCard() {
  const words = useCopy().users.settings.preferences;
  const language = useLanguageChoice();
  const theme = useThemeChoice();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{words.title}</h2>
        </CardTitle>
        <CardDescription>{words.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Field label={language.label} helper={language.helper}>
          <ToggleGroup
            type="single"
            value={language.value}
            onValueChange={(value) => {
              const chosen = language.options.find((option) => option.value === value);
              if (chosen !== undefined) language.choose(chosen.value);
            }}
            className="flex flex-wrap gap-2"
          >
            {language.options.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value} lang={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
        <Field label={theme.label} helper={theme.helper}>
          <ToggleGroup
            type="single"
            value={theme.value}
            onValueChange={(value) => {
              const chosen = theme.options.find((option) => option.value === value);
              if (chosen !== undefined) theme.choose(chosen.value);
            }}
            className="flex flex-wrap gap-2"
          >
            {theme.options.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      </CardContent>
    </Card>
  );
}
