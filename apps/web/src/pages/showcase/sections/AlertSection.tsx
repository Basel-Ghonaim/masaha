import { Alert, AlertAction, AlertDescription, AlertTitle, Button } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';

type AlertText = { title: string; description: string };

type AlertSamples = {
  title: string;
  caption: string;
  info: AlertText;
  warning: AlertText & { action: string };
  destructive: AlertText;
  titleOnlyCaption: string;
  titleOnly: string;
};

export function AlertSection({ samples }: { samples: AlertSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <div className="flex w-full max-w-120 flex-col gap-3">
          <Alert>
            <AlertTitle>{samples.info.title}</AlertTitle>
            <AlertDescription>{samples.info.description}</AlertDescription>
          </Alert>
          <Alert variant="warning">
            <AlertTitle>{samples.warning.title}</AlertTitle>
            <AlertDescription>{samples.warning.description}</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>{samples.destructive.title}</AlertTitle>
            <AlertDescription>{samples.destructive.description}</AlertDescription>
          </Alert>
        </div>
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.titleOnlyCaption}>
        <div className="flex w-full max-w-120 flex-col gap-3">
          <Alert variant="destructive" role="note">
            <AlertTitle>{samples.titleOnly}</AlertTitle>
          </Alert>
          <Alert variant="warning" role="note">
            <AlertTitle>{samples.warning.title}</AlertTitle>
            <AlertAction>
              <Button variant="link" size="sm" className="h-auto px-0 text-current">
                {samples.warning.action}
              </Button>
            </AlertAction>
          </Alert>
        </div>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
