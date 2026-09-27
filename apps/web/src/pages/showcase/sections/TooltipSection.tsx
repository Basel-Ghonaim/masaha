import {
  Button,
  LogOutIcon,
  SearchIcon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';

type TooltipSamples = {
  title: string;
  caption: string;
  search: string;
  signOut: string;
  openCaption: string;
  hintedAction: string;
  hint: string;
};

export function TooltipSection({ samples }: { samples: TooltipSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label={samples.search}>
              <SearchIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{samples.search}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={samples.signOut}>
              <LogOutIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{samples.signOut}</TooltipContent>
        </Tooltip>
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.openCaption}>
        <div className="pb-12">
          <Tooltip open>
            <TooltipTrigger asChild>
              <Button variant="outline">{samples.hintedAction}</Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{samples.hint}</TooltipContent>
          </Tooltip>
        </div>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
