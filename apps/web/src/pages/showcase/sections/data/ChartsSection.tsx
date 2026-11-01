import { BarChart, Heatmap } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type BarChartSamples = {
  title: string;
  stackedCaption: string;
  singleCaption: string;
  chart: string;
  period: string;
  unit: string;
  series: string[];
  months: { label: string; tick: string; values: number[] }[];
};

type HeatmapSamples = {
  title: string;
  caption: string;
  chart: string;
  unit: string;
  day: string;
  fewer: string;
  more: string;
  hours: string[];
  days: { label: string; values: number[] }[];
};

export function BarChartSection({ samples }: { samples: BarChartSamples }) {
  const format = (value: number) => `${String(value)} ${samples.unit}`;
  const [visits = '', subscriptions = ''] = samples.series;

  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.stackedCaption}>
        <BarChart
          className="w-full"
          title={samples.chart}
          periodLabel={samples.period}
          series={[
            { name: visits, tone: 1 },
            { name: subscriptions, tone: 2 },
          ]}
          data={samples.months}
          format={format}
        />
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.singleCaption}>
        <BarChart
          className="w-full max-w-sm"
          size="sm"
          title={samples.chart}
          periodLabel={samples.period}
          series={[{ name: visits, tone: 1 }]}
          data={samples.months.map((month) => ({ ...month, values: month.values.slice(0, 1) }))}
          format={format}
        />
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}

export function HeatmapSection({ samples }: { samples: HeatmapSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Heatmap
          className="w-full"
          title={samples.chart}
          unit={samples.unit}
          columns={samples.hours}
          rows={samples.days}
          fewer={samples.fewer}
          more={samples.more}
          dayLabel={samples.day}
        />
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
