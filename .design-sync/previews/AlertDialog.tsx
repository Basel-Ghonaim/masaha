import './_document';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from '@masaha/design-system';

// Ported from the showcase's AlertDialogSection
// (apps/web/src/pages/showcase/sections/AlertDialogSection.tsx), rendered open.

export function SuspendMembership() {
  return (
    <AlertDialog defaultOpen>
      <AlertDialogTrigger asChild>
        <Button variant="outline">إيقاف عضوية سارة الحلو</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>إيقاف عضوية سارة الحلو؟</AlertDialogTitle>
          <AlertDialogDescription>
            لن يتمكن المشترك من تسجيل الحضور. يمكنك إعادة تفعيل العضوية لاحقاً.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إبقاء العضوية فعّالة</AlertDialogCancel>
          <AlertDialogAction variant="destructive">إيقاف العضوية</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
