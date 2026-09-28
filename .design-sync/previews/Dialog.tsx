import './_document';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
} from '@masaha/design-system';

// Ported from the showcase's DialogSection (apps/web/src/pages/showcase/sections/DialogSection.tsx),
// rendered open so the card shows the window over its scrim.

export function RenameSpace() {
  return (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button variant="outline">تغيير اسم المساحة</Button>
      </DialogTrigger>
      <DialogContent
        closeLabel="إغلاق نافذة تغيير الاسم"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>تغيير اسم المساحة</DialogTitle>
          <DialogDescription>يظهر الاسم الجديد في الدليل فوراً.</DialogDescription>
        </DialogHeader>
        <Field label="اسم المساحة">
          <Input defaultValue="مساحة الريادة" />
        </Field>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">إبقاء الاسم الحالي</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>حفظ الاسم الجديد</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
