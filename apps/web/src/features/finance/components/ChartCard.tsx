import {
  BarChart,
  type BarChartProps,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import { useId } from 'react';

/** A chart in its card: the card's title (an `h2`) and the window it covers, then the chart. */
export function ChartCard({
  card,
  size,
}: {
  card: {
    title: string;
    description: string;
    chart: Pick<BarChartProps, 'title' | 'periodLabel' | 'series' | 'data' | 'format'>;
  };
  size: 'md' | 'sm';
}) {
  const headingId = useId();
  return (
    <Card role="region" aria-labelledby={headingId}>
      <CardHeader>
        <CardTitle>
          <h2 id={headingId}>{card.title}</h2>
        </CardTitle>
        <CardDescription>{card.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <BarChart {...card.chart} size={size} />
      </CardContent>
    </Card>
  );
}
