import { NAME_MAX_LENGTH } from '@masaha/shared/users';
import { Field, Input, SearchIcon, ToggleGroup, ToggleGroupItem } from '@shared/design-system';
import type { AdminUsersListView } from '../../hooks/users-list/useAdminUsersList';

/**
 * The search above a users list, then the count the filters keep and the state chips: a single
 * state filter of three choices is chips, at every width, not a field in a sheet (the owner's A7, P5).
 */
export function UsersToolbar({
  filters,
  count,
}: {
  filters: AdminUsersListView['filters'];
  /** The count the filters keep, said once loading has settled. */
  count: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label={filters.search.label}>
          <Input
            type="search"
            placeholder={filters.search.placeholder}
            startIcon={<SearchIcon />}
            maxLength={NAME_MAX_LENGTH}
            value={filters.search.text}
            onChange={(event) => {
              filters.search.change(event.target.value);
            }}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {count !== undefined && (
          <p className="text-body-sm text-muted-foreground" aria-live="polite">
            {count}
          </p>
        )}
        <ToggleGroup
          type="single"
          value={filters.state.value}
          onValueChange={filters.state.choose}
          aria-label={filters.state.label}
        >
          {filters.state.options.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
