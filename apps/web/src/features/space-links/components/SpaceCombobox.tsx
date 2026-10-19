import {
  Badge,
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxTrigger,
} from '@shared/design-system';
import { useCopy } from '@shared/copy';
import type { SpaceChoiceView } from '../types/SpaceChoiceView';
import type * as React from 'react';
import type { useSpaceChoices } from '../hooks/useSpaceChoices';

type Choices = ReturnType<typeof useSpaceChoices>;

export function SpaceCombobox({
  choices,
  chosen,
  choose,
  placeholder,
  triggerRef,
  disabled,
}: {
  choices: Choices;
  chosen: SpaceChoiceView | null;
  choose: (choice: SpaceChoiceView) => void;
  placeholder: string;
  triggerRef?: React.Ref<HTMLButtonElement>;
  disabled?: boolean;
}) {
  const words = useCopy().spaceLinks.choices;
  return (
    <Combobox
      type="single"
      value={chosen?.value}
      onValueChange={(value) => {
        const next = choices.options.find((option) => option.value === value);
        if (next !== undefined) choose(next);
      }}
    >
      <ComboboxTrigger ref={triggerRef} empty={!chosen} disabled={disabled}>
        {chosen === null ? (
          placeholder
        ) : (
          <span lang={chosen.name.lang} dir={chosen.name.dir}>
            {chosen.name.text}
          </span>
        )}
      </ComboboxTrigger>
      <ComboboxContent
        searchLabel={words.search}
        searchPlaceholder={words.spacesPlaceholder}
        search={choices.search}
        listLabel={words.spaces}
        emptyText={choices.empty}
        loading={choices.loading}
      >
        {choices.options.map((choice) => (
          <ComboboxItem key={choice.value} value={choice.value}>
            <span lang={choice.name.lang} dir={choice.name.dir}>
              {choice.name.text}
            </span>
            <span className="flex items-center gap-1">
              {choice.badges.map((badge, index) => (
                <Badge key={index} variant={badge.variant}>
                  {badge.label}
                </Badge>
              ))}
              <span className="text-caption text-muted-foreground">{choice.owners}</span>
            </span>
          </ComboboxItem>
        ))}
      </ComboboxContent>
    </Combobox>
  );
}
