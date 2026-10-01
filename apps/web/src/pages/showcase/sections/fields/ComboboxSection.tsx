import {
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxTrigger,
  Field,
} from '@shared/design-system';
import { useState } from 'react';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type ListSamples = {
  search: string;
  searchPlaceholder: string;
  list: string;
  empty: string;
  options: string[];
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
};

const FIELD_WIDTH = 'w-full max-w-80';

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

export function ComboboxSection({ samples }: { samples: ComboboxSamples }) {
  const { single, multiple, invalid, areas, amenities, filters } = samples;
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
