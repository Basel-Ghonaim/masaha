import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@shared/design-system';
import { Fragment } from 'react';
import { ShowcaseGroup, ShowcaseSection } from '../../ShowcaseSection';

type BreadcrumbSamples = {
  title: string;
  caption: string;
  label: string;
  trail: string[];
  current: string;
  longCaption: string;
  more: string;
};

export function BreadcrumbSection({ samples }: { samples: BreadcrumbSamples }) {
  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        <Breadcrumb label={samples.label}>
          <BreadcrumbList>
            {samples.trail.map((page) => (
              <Fragment key={page}>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">{page}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </Fragment>
            ))}
            <BreadcrumbItem>
              <BreadcrumbPage>{samples.current}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </ShowcaseGroup>
      <ShowcaseGroup caption={samples.longCaption}>
        <Breadcrumb label={samples.label}>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">{samples.trail[0]}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbEllipsis label={samples.more} />
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{samples.current}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
