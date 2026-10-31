import { SPACE_NAME_MAX_LENGTH } from '@masaha/shared/spaces';
import { Field, Input, SearchIcon } from '@shared/design-system';
import type { DirectoryListView } from '../../types/DirectoryListView';

/** The directory's search: both names of a space and its area, its label read but not shown. */
export function DirectorySearch({ search }: { search: DirectoryListView['search'] }) {
  return (
    <Field
      label={<span className="sr-only">{search.label}</span>}
      error={search.error}
      className="flex-1"
    >
      <Input
        type="search"
        maxLength={SPACE_NAME_MAX_LENGTH}
        placeholder={search.placeholder}
        startIcon={<SearchIcon />}
        value={search.text}
        onChange={(event) => {
          search.change(event.target.value);
        }}
      />
    </Field>
  );
}
