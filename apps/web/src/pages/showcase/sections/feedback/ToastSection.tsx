import { Button, toast } from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type ToastSamples = {
  title: string;
  caption: string;
  plain: { trigger: string; message: string };
  success: { trigger: string; message: string };
  info: { trigger: string; message: string; description: string };
  warning: { trigger: string; message: string };
  error: { trigger: string; message: string; description: string };
  action: { trigger: string; message: string; label: string };
};

export function ToastSection({ samples }: { samples: ToastSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Button variant="outline" onClick={() => toast(samples.plain.message)}>
          {samples.plain.trigger}
        </Button>
        <Button variant="outline" onClick={() => toast.success(samples.success.message)}>
          {samples.success.trigger}
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.info(samples.info.message, { description: samples.info.description })
          }
        >
          {samples.info.trigger}
        </Button>
        <Button variant="outline" onClick={() => toast.warning(samples.warning.message)}>
          {samples.warning.trigger}
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.error(samples.error.message, { description: samples.error.description })
          }
        >
          {samples.error.trigger}
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast(samples.action.message, {
              action: { label: samples.action.label, onClick: () => undefined },
            })
          }
        >
          {samples.action.trigger}
        </Button>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
