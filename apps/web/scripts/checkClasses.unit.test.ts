import { describe, expect, it } from 'vitest';
import { findPhysicalClasses } from './checkClasses';

const classesIn = (source: string) => findPhysicalClasses(source).map((hit) => hit.className);

describe('findPhysicalClasses', () => {
  it.each([
    'ml-2',
    'mr-auto',
    'pl-4',
    'pr-0.5',
    '-ml-px',
    'left-0',
    'right-1/2',
    '-left-[3px]',
    'right-(--offset)',
    'text-left',
    'text-right',
    'border-l',
    'border-r-2',
    'rounded-l-lg',
    'rounded-tr-md',
    'scroll-ml-2',
    'float-right',
    'clear-left',
  ])('flags %s', (className) => {
    expect(classesIn(`<div className="flex ${className} gap-2" />`)).toEqual([className]);
  });

  it.each([
    ['md:ml-2', 'ml-2'],
    ['hover:text-right', 'text-right'],
    ['rtl:-left-1', '-left-1'],
    ['!pl-2', 'pl-2'],
    ['pr-4!', 'pr-4!'],
  ])('flags a physical class behind a modifier: %s', (written, className) => {
    expect(classesIn(`cn('${written}')`)).toEqual([className]);
  });

  it('flags a physical class in a CSS @apply', () => {
    expect(classesIn('.x { @apply ms-2 mr-2; }')).toEqual(['mr-2']);
  });

  it.each([
    'ms-2',
    'me-auto',
    'ps-4',
    'pe-0.5',
    'start-0',
    'end-1/2',
    'text-start',
    'text-end',
    'border-s',
    'border-e-2',
    'rounded-s-lg',
    'rounded-se-md',
    'scroll-ms-2',
    'float-start',
    'clear-end',
    'mx-auto',
    'px-4',
    'inset-x-0',
    'border',
    'rounded-lg',
    'rounded-t-md',
  ])('does not flag the logical or symmetric class %s', (className) => {
    expect(classesIn(`<div className="${className}" />`)).toEqual([]);
  });

  it.each(['origin-top-left', 'bg-left', 'translate-x-2'])(
    'does not flag %s, which has no logical form',
    (className) => {
      expect(classesIn(`<div className="${className}" />`)).toEqual([]);
    },
  );

  it.each(['html-parser', 'copyright-notice', 'margin-left: 0;', "import x from './left-1';"])(
    'does not flag text that is not a class: %s',
    (source) => {
      expect(classesIn(source)).toEqual([]);
    },
  );

  it('reports the line and column of each hit', () => {
    expect(findPhysicalClasses("const a = 'ps-2';\nconst b = 'mt-1 ml-2';")).toEqual([
      { line: 2, column: 17, className: 'ml-2' },
    ]);
  });
});
