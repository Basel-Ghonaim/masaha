import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';

type CardSamples = {
  title: string;
  caption: string;
  cardTitle: string;
  description: string;
  action: string;
  content: string;
  footer: string;
  plainCaption: string;
  plain: string;
};

const CARD_WIDTH = 'w-full max-w-96';

export function CardSection({ samples }: { samples: CardSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Card className={CARD_WIDTH}>
          <CardHeader>
            <CardTitle>{samples.cardTitle}</CardTitle>
            <CardDescription>{samples.description}</CardDescription>
            <CardAction>
              <Button variant="outline" size="sm">
                {samples.action}
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>{samples.content}</CardContent>
          <CardFooter className="text-caption text-muted-foreground">{samples.footer}</CardFooter>
        </Card>
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.plainCaption}>
        <Card className={CARD_WIDTH}>
          <CardContent>{samples.plain}</CardContent>
        </Card>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
