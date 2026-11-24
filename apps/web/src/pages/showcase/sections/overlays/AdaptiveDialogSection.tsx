import {
  AdaptiveDialog,
  AdaptiveDialogContent,
  AdaptiveDialogDescription,
  AdaptiveDialogFooter,
  AdaptiveDialogHeader,
  AdaptiveDialogTitle,
  Button,
} from '@shared/design-system';
import { useState } from 'react';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type AdaptiveDialogSamples = {
  title: string;
  caption: string;
  trigger: string;
  dialogTitle: string;
  description: string;
  paragraphs: string[];
  secondary: string;
  primary: string;
  closeLabel: string;
};

/**
 * The preview's width chooses its form: a dialog at 768 and 1280, the full-screen panel at 360,
 * whose body scrolls under the bar once the text outgrows it.
 */
export function AdaptiveDialogSection({ samples }: { samples: AdaptiveDialogSamples }) {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };

  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Button
          variant="outline"
          onClick={() => {
            setOpen(true);
          }}
        >
          {samples.trigger}
        </Button>
        <AdaptiveDialog open={open} onOpenChange={setOpen}>
          <AdaptiveDialogContent closeLabel={samples.closeLabel}>
            <AdaptiveDialogHeader>
              <AdaptiveDialogTitle>{samples.dialogTitle}</AdaptiveDialogTitle>
              <AdaptiveDialogDescription>{samples.description}</AdaptiveDialogDescription>
            </AdaptiveDialogHeader>
            {samples.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <AdaptiveDialogFooter>
              <Button variant="outline" onClick={close}>
                {samples.secondary}
              </Button>
              <Button onClick={close}>{samples.primary}</Button>
            </AdaptiveDialogFooter>
          </AdaptiveDialogContent>
        </AdaptiveDialog>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
