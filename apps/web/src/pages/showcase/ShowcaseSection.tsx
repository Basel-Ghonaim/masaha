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
