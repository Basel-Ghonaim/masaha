import { Meter } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type MeterSamples = {
  title: string;
  caption: string;
  occupancy: { label: string; value: number; max: number; text: string };
  full: { label: string; value: number; max: number; text: string };
  progressCaption: string;
  upload: { label: string; value: number };
};

export function MeterSection({ samples }: { samples: MeterSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <div className="flex w-full max-w-sm flex-col gap-4">
          <Meter
            label={samples.occupancy.label}
            value={samples.occupancy.value}
            max={samples.occupancy.max}
            valueText={samples.occupancy.text}
          />
          <Meter
            tone="warning"
            label={samples.full.label}
            value={samples.full.value}
            max={samples.full.max}
            valueText={samples.full.text}
          />
        </div>
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.progressCaption}>
        <div className="flex w-full max-w-sm flex-col gap-4">
          <Meter
            kind="progress"
            label={samples.upload.label}
            value={samples.upload.value}
            max={100}
          />
        </div>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
