import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type AlertDialogSamples = {
  title: string;
  caption: string;
  trigger: string;
  dialogTitle: string;
  description: string;
  cancel: string;
  action: string;
};

export function AlertDialogSection({ samples }: { samples: AlertDialogSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">{samples.trigger}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{samples.dialogTitle}</AlertDialogTitle>
              <AlertDialogDescription>{samples.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{samples.cancel}</AlertDialogCancel>
              <AlertDialogAction variant="destructive">{samples.action}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
