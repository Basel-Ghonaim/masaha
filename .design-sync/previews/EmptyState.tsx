import './_document';
import { Button, Card, EmptyState, SearchXIcon, UsersIcon } from '@masaha/design-system';

// Ported from the showcase's EmptyStateSection (apps/web/src/pages/showcase/sections/EmptyStateSection.tsx).

export function SearchNoResults() {
  return (
    <Card className="w-full max-w-120">
      <EmptyState
        icon={<SearchXIcon />}
        title="لا يوجد مشترك باسم «خالد»"
        description="تحقّق من كتابة الاسم، أو ابحث برقم الهاتف."
        titleAs="h3"
      >
        <Button variant="outline">مسح البحث</Button>
        <Button>إضافة مشترك</Button>
      </EmptyState>
    </Card>
  );
}

export function FirstTime() {
  return (
    <Card className="w-full max-w-120">
      <EmptyState
        icon={<UsersIcon />}
        title="لا يوجد مشتركون بعد"
        description="أضف أول مشترك لتبدأ بتسجيل الحضور."
        titleAs="h3"
      >
        <Button>إضافة أول مشترك</Button>
      </EmptyState>
    </Card>
  );
}
