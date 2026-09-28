import './_document';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@masaha/design-system';

// Ported from the showcase's TabsSection (apps/web/src/pages/showcase/sections/TabsSection.tsx).

type TabItem = { value: string; label: string; content: string };

const STATUSES: TabItem[] = [
  { value: 'members-all-tab', label: 'كل المشتركين 38', content: 'جميع مشتركي مساحة الريادة.' },
  {
    value: 'members-active-tab',
    label: 'النشطون الآن 31',
    content: 'المشتركون الذين عضويتهم فعّالة.',
  },
  {
    value: 'members-ending-tab',
    label: 'تنتهي هذا الأسبوع 5',
    content: 'عضويات تنتهي خلال 7 أيام.',
  },
  { value: 'members-expired-tab', label: 'المنتهية سابقاً 2', content: 'عضويات انتهت.' },
];

const SECTIONS: TabItem[] = [
  {
    value: 'profile-details-tab',
    label: 'بيانات المساحة',
    content: 'الاسم والمنطقة والسعة ووسائل التواصل.',
  },
  {
    value: 'profile-hours-tab',
    label: 'ساعات الدوام',
    content: 'من السبت إلى الخميس، من 08:00 حتى 20:00.',
  },
  { value: 'profile-photos-tab', label: 'صور المساحة', content: 'حتى ثماني صور للمساحة.' },
];

function TabsSample({
  label,
  items,
  variant,
}: {
  label: string;
  items: TabItem[];
  variant: 'default' | 'line';
}) {
  return (
    <Tabs defaultValue={items[0]?.value} className="w-full">
      <TabsList aria-label={label} variant={variant}>
        {items.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {items.map((item) => (
        <TabsContent key={item.value} value={item.value} className="text-muted-foreground">
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}

/** The default variant: a segmented control (pills on a phone). */
export function Default() {
  return (
    <div className="w-full">
      <TabsSample label="تصفية المشتركين حسب الحالة" items={STATUSES} variant="default" />
    </div>
  );
}

/** The line variant: the sections of a page. */
export function Line() {
  return (
    <div className="w-full">
      <TabsSample label="أقسام ملف المساحة" items={SECTIONS} variant="line" />
    </div>
  );
}
