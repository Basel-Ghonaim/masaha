import './_document';
import { Alert, AlertAction, AlertDescription, AlertTitle, Button } from '@masaha/design-system';

// Ported from the showcase's AlertSection (apps/web/src/pages/showcase/sections/AlertSection.tsx).

export function Variants() {
  return (
    <div className="flex w-full max-w-120 flex-col gap-3">
      <Alert>
        <AlertTitle>الأسعار للاطلاع فقط</AlertTitle>
        <AlertDescription>تأكّد منها مع المساحة قبل زيارتك.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <AlertTitle>قد تكون ساعات العمل قديمة</AlertTitle>
        <AlertDescription>آخر تحديث لها قبل أكثر من 90 يومًا.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>تعذّر حفظ بيانات المساحة</AlertTitle>
        <AlertDescription>تحقّق من اتصالك بالإنترنت ثم حاول مرة أخرى.</AlertDescription>
      </Alert>
    </div>
  );
}

export function TitleOnlyAndAction() {
  return (
    <div className="flex w-full max-w-120 flex-col gap-3">
      <Alert variant="destructive" role="note">
        <AlertTitle>انتهت عضوية هذا المشترك</AlertTitle>
      </Alert>
      <Alert variant="warning" role="note">
        <AlertTitle>قد تكون ساعات العمل قديمة</AlertTitle>
        <AlertAction>
          <Button variant="link" size="sm" className="h-auto px-0 text-current">
            الإبلاغ عن معلومة خاطئة
          </Button>
        </AlertAction>
      </Alert>
    </div>
  );
}
