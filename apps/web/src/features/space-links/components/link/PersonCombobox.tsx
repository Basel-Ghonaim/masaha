import { useCopy } from '@shared/copy';
import { Combobox, ComboboxContent, ComboboxItem, ComboboxTrigger } from '@shared/design-system';
import type * as React from 'react';
import type { usePersonChoices } from '../../hooks/link/usePersonChoices';
import type { PersonChoiceView } from '../../types/PersonChoiceView';

type Choices = ReturnType<typeof usePersonChoices>;

/**
 * One person to choose, searched on the server: each option their name, then their email and what
 * they are. The chosen person stays on the trigger while the results change.
 */
export function PersonCombobox({
  choices,
  chosen,
  choose,
  placeholder,
  triggerRef,
}: {
  choices: Choices;
  chosen: PersonChoiceView | null;
  choose: (choice: PersonChoiceView) => void;
  placeholder: string;
  triggerRef?: React.Ref<HTMLButtonElement>;
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
      <ComboboxTrigger ref={triggerRef} empty={!chosen}>
        {chosen === null ? placeholder : <bdi>{chosen.name}</bdi>}
      </ComboboxTrigger>
      <ComboboxContent
        searchLabel={words.search}
        searchPlaceholder={words.peoplePlaceholder}
        search={choices.search}
        listLabel={words.people}
        emptyText={choices.empty}
        loading={choices.loading}
      >
        {choices.options.map((choice) => (
          <ComboboxItem key={choice.value} value={choice.value}>
            <span className="flex min-w-0 flex-col">
              <bdi>{choice.name}</bdi>
              <span className="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
                <span dir="ltr">{choice.email}</span>
                <span>{choice.kind}</span>
              </span>
            </span>
          </ComboboxItem>
        ))}
      </ComboboxContent>
    </Combobox>
  );
}
