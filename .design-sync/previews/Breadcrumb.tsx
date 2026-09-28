import './_document';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@masaha/design-system';
import { Fragment } from 'react';

// Ported from the showcase's BreadcrumbSection
// (apps/web/src/pages/showcase/sections/BreadcrumbSection.tsx).

const LABEL = 'المسار إلى صفحة لوحة التحكم هذه';
const TRAIL = ['لوحة تحكم المالك', 'مشتركو مساحة الريادة'];
const CURRENT = 'عضوية سارة الحلو';

/** The path to a sub-page of the dashboard. */
export function Trail() {
  return (
    <Breadcrumb label={LABEL}>
      <BreadcrumbList>
        {TRAIL.map((page) => (
          <Fragment key={page}>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">{page}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </Fragment>
        ))}
        <BreadcrumbItem>
          <BreadcrumbPage>{CURRENT}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** A long path, with the middle pages collapsed into an ellipsis. */
export function Collapsed() {
  return (
    <Breadcrumb label={LABEL}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">{TRAIL[0]}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis label="صفحات محذوفة من المسار" />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{CURRENT}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
