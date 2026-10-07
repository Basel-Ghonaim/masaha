import {
  Badge,
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@shared/design-system';
import type { AdminSpacesListView } from '../../types/AdminSpacesListView';
import type { PlaceField } from '../../types/PlaceField';
import { FilterFields } from './FilterFields';

/**
 * The phone's filters: a button that shows how many apply, opening a bottom sheet with the place,
 * the state and stale only, which apply at once, and a button that clears them.
 */
export function FiltersSheet({
  filters,
  placeField,
}: {
  filters: AdminSpacesListView['filters'];
  placeField: PlaceField;
}) {
  const { sheet } = filters;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full" aria-label={sheet.label}>
          {sheet.text}
          {sheet.count > 0 && (
            <Badge variant="primary" aria-hidden>
              {sheet.count}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" closeLabel={sheet.closeLabel} aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{sheet.title}</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-4">
          <FilterFields filters={filters} placeField={placeField} />
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={sheet.clear}>
            {sheet.clearLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
