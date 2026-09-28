import {
  ArrowDownIcon,
  ArrowEndIcon,
  ArrowStartIcon,
  ArrowUpIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronEndIcon,
  ChevronStartIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  EllipsisIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  EyeOffIcon,
  InfoIcon,
  LanguagesIcon,
  LoaderIcon,
  LogInIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  SearchIcon,
  SearchXIcon,
  SunIcon,
  TriangleAlertIcon,
  UsersIcon,
  XIcon,
  type IconProps,
} from '@shared/design-system';
import type { ComponentType } from 'react';
import { ShowcaseSection } from '../ShowcaseSection';

type IconsSamples = { title: string; mirrored: string; fixed: string };

const MIRRORED = [
  ChevronStartIcon,
  ChevronEndIcon,
  ArrowStartIcon,
  ArrowEndIcon,
  LogInIcon,
  LogOutIcon,
];
const FIXED = [
  SearchIcon,
  SearchXIcon,
  LoaderIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  UsersIcon,
  EyeIcon,
  EyeOffIcon,
  LanguagesIcon,
  MoonIcon,
  SunIcon,
  XIcon,
  EllipsisIcon,
  EllipsisVerticalIcon,
  MenuIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronsUpDownIcon,
];

function IconGroup({ caption, icons }: { caption: string; icons: ComponentType<IconProps>[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption text-muted-foreground">{caption}</p>
      <ul className="flex flex-wrap gap-3">
        {icons.map((Icon) => (
          <li
            key={Icon.name}
            className="flex items-center gap-2 rounded-md border border-border bg-card p-3 text-card-foreground"
          >
            <Icon className="size-6" />
            {/* The export's name, shown as code: this page is a development tool. */}
            <code dir="ltr" className="text-body-sm">
              {Icon.name}
            </code>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IconsSection({ samples }: { samples: IconsSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <IconGroup caption={samples.mirrored} icons={MIRRORED} />
      <IconGroup caption={samples.fixed} icons={FIXED} />
    </ShowcaseSection>
  );
}
