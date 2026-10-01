import {
  Button,
  CheckIcon,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  EllipsisIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  XIcon,
} from '@shared/design-system';
import { useState } from 'react';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type DropdownMenuSamples = {
  title: string;
  rowCaption: string;
  rowLabel: string;
  view: string;
  markCorrected: string;
  unavailable: string;
  reject: string;
  optionsCaption: string;
  optionsTrigger: string;
  columnsLabel: string;
  columns: string[];
  sortLabel: string;
  sorts: string[];
  moreLabel: string;
  more: string[];
};

export function DropdownMenuSection({ samples }: { samples: DropdownMenuSamples }) {
  const [shown, setShown] = useState<string[]>(samples.columns.slice(0, 2));
  const [sort, setSort] = useState(samples.sorts[0] ?? '');

  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.rowCaption}>
        {[EllipsisIcon, EllipsisVerticalIcon].map((Icon, index) => (
          <DropdownMenu key={index}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={samples.rowLabel}>
                <Icon aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>
                <EyeIcon aria-hidden />
                {samples.view}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CheckIcon aria-hidden />
                {samples.markCorrected}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>{samples.unavailable}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">
                <XIcon aria-hidden />
                {samples.reject}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.optionsCaption}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">{samples.optionsTrigger}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>{samples.columnsLabel}</DropdownMenuLabel>
            {samples.columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column}
                checked={shown.includes(column)}
                onCheckedChange={(checked) => {
                  setShown((current) =>
                    checked ? [...current, column] : current.filter((item) => item !== column),
                  );
                }}
              >
                {column}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{samples.sortLabel}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
              {samples.sorts.map((option) => (
                <DropdownMenuRadioItem key={option} value={option}>
                  {option}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>{samples.moreLabel}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {samples.more.map((item) => (
                  <DropdownMenuItem key={item}>{item}</DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
