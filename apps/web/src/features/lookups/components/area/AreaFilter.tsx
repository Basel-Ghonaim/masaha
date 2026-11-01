import {
  Button,
  Combobox,
  ComboboxContent,
  ComboboxGroup,
  ComboboxItem,
  ComboboxTrigger,
  Field,
} from '@shared/design-system';
import { useAreaFilter } from '../../hooks/area/useAreaFilter';

/**
 * The site's place filter: any number of areas from the public catalogue, grouped under their
 * governorates, found by either of their names, in a field named by its label. Its trigger sums up
 * the choice. Once the catalogue has failed, the list says so and offers to try again. At the most
 * areas the directory takes, the others are held and the field's helper says so.
 */
export function AreaFilter({
  value,
  onValueChange,
}: {
  value: readonly number[];
  onValueChange: (ids: number[]) => void;
}) {
  const filter = useAreaFilter({ value });

  return (
    <Field label={filter.label} helper={filter.max ?? undefined}>
      <Combobox
        type="multiple"
        value={value.map(String)}
        onValueChange={(chosen) => {
          onValueChange(chosen.map(Number));
        }}
      >
        <ComboboxTrigger empty={value.length === 0}>{filter.summary}</ComboboxTrigger>
        <ComboboxContent
          searchLabel={filter.search}
          searchPlaceholder={filter.searchPlaceholder}
          listLabel={filter.list}
          emptyText={
            filter.failure === null ? (
              filter.none
            ) : (
              <span className="flex flex-col items-center gap-2">
                {filter.failure.line}
                <Button variant="outline" size="sm" onClick={filter.failure.retry.run}>
                  {filter.failure.retry.label}
                </Button>
              </span>
            )
          }
          loading={filter.loading ?? undefined}
        >
          {filter.groups.map((group) => (
            <ComboboxGroup key={group.key} heading={group.heading}>
              {group.items.map((item) => (
                <ComboboxItem
                  key={item.value}
                  value={item.value}
                  keywords={item.keywords}
                  disabled={item.held}
                >
                  {item.text}
                </ComboboxItem>
              ))}
            </ComboboxGroup>
          ))}
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}
