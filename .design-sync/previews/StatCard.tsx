import './_document';
import { StatCard, UsersIcon } from '@masaha/design-system';

// Ported from the showcase's StatCardSection (apps/web/src/pages/showcase/sections/StatCardSection.tsx).

export function WithIconAndHelper() {
  return (
    <StatCard
      className="w-full max-w-80"
      label="حاضرون الآن"
      value={<span dir="ltr">7 / 40</span>}
      helper="من المقاعد المتاحة"
      icon={<UsersIcon />}
    />
  );
}

export function WithHelper() {
  return (
    <StatCard
      className="w-full max-w-80"
      label="عضويات تنتهي هذا الأسبوع"
      value={5}
      helper="منها 2 خلال يومين"
    />
  );
}

export function ValueOnly() {
  return <StatCard className="w-full max-w-80" label="بلاغات جديدة" value={3} />;
}

// The dashboard overview row.
export function Overview() {
  return (
    <div className="grid w-full gap-4 md:grid-cols-3">
      <StatCard
        label="حاضرون الآن"
        value={<span dir="ltr">7 / 40</span>}
        helper="من المقاعد المتاحة"
        icon={<UsersIcon />}
      />
      <StatCard label="عضويات تنتهي هذا الأسبوع" value={5} helper="منها 2 خلال يومين" />
      <StatCard label="بلاغات جديدة" value={3} />
    </div>
  );
}
