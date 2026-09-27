import { StatCard, UsersIcon } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';

type StatCardSamples = {
  title: string;
  caption: string;
  present: { label: string; value: string; helper: string };
  ending: { label: string; value: number; helper: string };
  reports: { label: string; value: number };
};

export function StatCardSection({ samples }: { samples: StatCardSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <div className="grid w-full gap-4 md:grid-cols-3">
          <StatCard
            label={samples.present.label}
            value={<span dir="ltr">{samples.present.value}</span>}
            helper={samples.present.helper}
            icon={<UsersIcon />}
          />
          <StatCard
            label={samples.ending.label}
            value={samples.ending.value}
            helper={samples.ending.helper}
          />
          <StatCard label={samples.reports.label} value={samples.reports.value} />
        </div>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
