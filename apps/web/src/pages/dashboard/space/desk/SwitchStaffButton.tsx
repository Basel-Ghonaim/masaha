import { Button, DropdownMenuItem } from '@shared/design-system';
import { useSwitchStaff } from './useSwitchStaff';

/** «تبديل الموظف» from 768 px: an outline button in the desk's top bar. */
export function SwitchStaffButton({ spaceId }: { spaceId: number }) {
  const switchStaff = useSwitchStaff(spaceId);
  return (
    <Button
      variant="outline"
      size="sm"
      loading={switchStaff.busy}
      onClick={() => void switchStaff.run()}
    >
      {switchStaff.label}
    </Button>
  );
}

/** «تبديل الموظف» below 768 px: an item of the desk's «⋯» menu. */
export function SwitchStaffItem({ spaceId }: { spaceId: number }) {
  const switchStaff = useSwitchStaff(spaceId);
  return (
    <DropdownMenuItem disabled={switchStaff.busy} onSelect={() => void switchStaff.run()}>
      {switchStaff.label}
    </DropdownMenuItem>
  );
}
