import {
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxTrigger,
  Field,
} from '@shared/design-system';
import { useEffect, useState } from 'react';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type ListSamples = {
  search: string;
  searchPlaceholder: string;
  list: string;
  empty: string;
  options: string[];
};

type CallerSamples = ListSamples & {
  caption: string;
  label: string;
  placeholder: string;
  loading: string;
};

type ComboboxSamples = {
  title: string;
  caption: string;
  single: { label: string; placeholder: string };
  multiple: { label: string; placeholder: string; summary: string };
  invalid: { label: string; placeholder: string; error: string };
  areas: ListSamples;
  amenities: ListSamples;
  filterCaption: string;
  filters: { status: string; area: string; statuses: ListSamples };
  caller: CallerSamples;
};

const FIELD_WIDTH = 'w-full max-w-80';
/** How long the sample stands still before it answers, as a server would after a search. */
const SERVER_PAUSE_MS = 300;

// Values come from position: every fixture string is searched for in the build, so fixtures hold
// phrases only.
function Options({ options }: { options: string[] }) {
  return options.map((option, index) => (
    <ComboboxItem key={option} value={String(index)}>
      {option}
    </ComboboxItem>
  ));
}

function List({ samples }: { samples: ListSamples }) {
  return (
    <ComboboxContent
      searchLabel={samples.search}
      searchPlaceholder={samples.searchPlaceholder}
      listLabel={samples.list}
      emptyText={samples.empty}
    >
      <Options options={samples.options} />
    </ComboboxContent>
  );
}

/**
 * The options a server would answer `text` with: the sample filtered once the typing has paused,
 * and a line while it is on its way — which is what a caller with its own search passes to the list.
 */
function useAnsweredOptions(all: string[], text: string) {
  const [answered, setAnswered] = useState<{ options: string[]; text: string | null }>({
    options: all,
    text: null,
  });
  useEffect(() => {
    const timer = setTimeout(() => {
      const needle = text.trim().toLowerCase();
      setAnswered({
        options:
          needle === '' ? all : all.filter((option) => option.toLowerCase().includes(needle)),
        text,
      });
    }, SERVER_PAUSE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [all, text]);
  // While the answer is for an earlier text, the caller's search is still on its way.
  return { options: answered.options, searching: answered.text !== text };
}

/** A list whose options the caller finds itself: the search box is its own, and so is the answer. */
function CallerSearch({ samples }: { samples: CallerSamples }) {
  const [text, setText] = useState('');
  const answered = useAnsweredOptions(samples.options, text);

  return (
    <Field label={samples.label} className={FIELD_WIDTH}>
      <Combobox type="single">
        <ComboboxTrigger empty>{samples.placeholder}</ComboboxTrigger>
        <ComboboxContent
          searchLabel={samples.search}
          searchPlaceholder={samples.searchPlaceholder}
          search={{ value: text, onValueChange: setText }}
          listLabel={samples.list}
          emptyText={samples.empty}
          loading={answered.searching ? samples.loading : undefined}
        >
          <Options options={answered.options} />
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}

export function ComboboxSection({ samples }: { samples: ComboboxSamples }) {
  const { single, multiple, invalid, areas, amenities, filters, caller } = samples;
  const [area, setArea] = useState('');
  const [chosenAmenities, setChosenAmenities] = useState(['0', '2']);

  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Field label={single.label} className={FIELD_WIDTH}>
          <Combobox type="single" value={area} onValueChange={setArea}>
            <ComboboxTrigger empty={area === ''}>
              {area === '' ? single.placeholder : areas.options[Number(area)]}
            </ComboboxTrigger>
            <List samples={areas} />
          </Combobox>
        </Field>
        <Field label={multiple.label} className={FIELD_WIDTH}>
          <Combobox type="multiple" value={chosenAmenities} onValueChange={setChosenAmenities}>
            <ComboboxTrigger empty={chosenAmenities.length === 0}>
              {chosenAmenities.length === 0
                ? multiple.placeholder
                : multiple.summary.replace('{count}', String(chosenAmenities.length))}
            </ComboboxTrigger>
            <List samples={amenities} />
          </Combobox>
        </Field>
        <Field label={invalid.label} error={invalid.error} className={FIELD_WIDTH}>
          <Combobox type="single">
            <ComboboxTrigger empty>{invalid.placeholder}</ComboboxTrigger>
            <List samples={areas} />
          </Combobox>
        </Field>
      </ShowcaseGroup>
      <ShowcaseGroup caption={caller.caption}>
        <CallerSearch samples={caller} />
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.filterCaption}>
        <Combobox type="multiple" defaultValue={['0', '1']}>
          <ComboboxTrigger className="w-auto">{filters.status}</ComboboxTrigger>
          <List samples={filters.statuses} />
        </Combobox>
        <Combobox type="single">
          <ComboboxTrigger className="w-auto">{filters.area}</ComboboxTrigger>
          <List samples={areas} />
        </Combobox>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
