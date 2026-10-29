import { useCopy } from '@shared/copy';
import {
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxTrigger,
  Field,
} from '@shared/design-system';
import type { SpaceNameView } from '@shared/lib';
import { useState } from 'react';
import { useSpaceChoices } from '../../hooks/useSpaceChoices';

/** «كل المساحات», the first choice, as a value no space id takes. */
const ALL = 'all';

/**
 * One space to filter a list by, as the admin's data reports do: a Field named by `label` around a
 * search of the platform's spaces on the server, once typing pauses, read only while the list is
 * open. Its first choice, «كل المساحات», clears it. The trigger shows the chosen space's name —
 * `chosenName`, the caller's, else the choice's — or `chosenFallback` until either is known.
 */
export function AdminSpaceFilter({
  label,
  value,
  chosenName,
  chosenFallback,
  onChange,
}: {
  label: string;
  value: number | undefined;
  chosenName: SpaceNameView | null;
  chosenFallback: string;
  onChange: (spaceId: number | undefined) => void;
}) {
  const words = useCopy().spaceLinks.choices;
  const [open, setOpen] = useState(false);
  const choices = useSpaceChoices({ enabled: open });
  const chosen =
    value === undefined
      ? { text: words.allSpaces }
      : (chosenName ??
        choices.options.find((option) => option.id === value)?.name ?? { text: chosenFallback });

  return (
    <Field label={label}>
      <Combobox
        type="single"
        open={open}
        onOpenChange={setOpen}
        value={value === undefined ? ALL : String(value)}
        onValueChange={(next) => {
          if (next === ALL) {
            onChange(undefined);
            return;
          }
          const option = choices.options.find((each) => each.value === next);
          if (option !== undefined) onChange(option.id);
        }}
      >
        <ComboboxTrigger>
          <span lang={chosen.lang} dir={chosen.dir}>
            {chosen.text}
          </span>
        </ComboboxTrigger>
        <ComboboxContent
          searchLabel={words.search}
          searchPlaceholder={words.spacesPlaceholder}
          search={choices.search}
          listLabel={words.spaces}
          emptyText={choices.empty}
          loading={choices.loading}
        >
          <ComboboxItem value={ALL}>{words.allSpaces}</ComboboxItem>
          {choices.options.map((choice) => (
            <ComboboxItem key={choice.value} value={choice.value}>
              <span lang={choice.name.lang} dir={choice.name.dir}>
                {choice.name.text}
              </span>
            </ComboboxItem>
          ))}
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}
