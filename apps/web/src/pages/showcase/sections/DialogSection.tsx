import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
} from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';

type DialogSamples = {
  title: string;
  caption: string;
  trigger: string;
  dialogTitle: string;
  description: string;
  fieldLabel: string;
  fieldValue: string;
  keep: string;
  save: string;
  closeLabel: string;
};

export function DialogSection({ samples }: { samples: DialogSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">{samples.trigger}</Button>
          </DialogTrigger>
          <DialogContent closeLabel={samples.closeLabel}>
            <DialogHeader>
              <DialogTitle>{samples.dialogTitle}</DialogTitle>
              <DialogDescription>{samples.description}</DialogDescription>
            </DialogHeader>
            <Field label={samples.fieldLabel}>
              <Input defaultValue={samples.fieldValue} />
            </Field>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{samples.keep}</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button>{samples.save}</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
