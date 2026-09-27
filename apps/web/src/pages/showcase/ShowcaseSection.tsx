import type { ReactNode } from 'react';

type ShowcaseSectionProps = {
  title: string;
  children: ReactNode;
};

/** One section of the preview: a component (or layer part) with every variant and state. */
export function ShowcaseSection({ title, children }: ShowcaseSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-heading-2">{title}</h2>
      {children}
    </section>
  );
}

type ShowcaseGroupProps = {
  caption: string;
  children: ReactNode;
};

/** A captioned row inside a section: one variant family or one set of states. */
export function ShowcaseGroup({ caption, children }: ShowcaseGroupProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption text-muted-foreground">{caption}</p>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </div>
  );
}
