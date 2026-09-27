import { describe, expect, it } from 'vitest';
import { findArbitraryValueClasses, findPhysicalClasses } from './checkClasses';

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

const arbitraryIn = (source: string) =>
  findArbitraryValueClasses(source).map((hit) => hit.className);

describe('findArbitraryValueClasses', () => {
  it.each([
    'text-[13px]',
    'bg-[#fff]',
    'bg-(--brand-600)',
    'w-[calc(100%-2rem)]',
    'grid-cols-[1fr_2fr]',
    '-mt-[3px]',
    'bg-primary/[0.5]',
    '[mask-type:alpha]',
  ])('flags %s', (className) => {
    expect(arbitraryIn(`<div className="flex ${className} gap-2" />`)).toEqual([className]);
  });

  it.each([
    'md:w-[320px]',
    'hover:bg-[#fff]',
    'data-[state=open]:w-[3px]',
    '!p-[3px]',
    'dark:[color:red]',
  ])('flags an arbitrary value behind a modifier: %s', (className) => {
    expect(arbitraryIn(`cn('${className}')`)).toEqual([className]);
  });

  it('flags an arbitrary value in a CSS @apply', () => {
    expect(arbitraryIn('.x { @apply p-2 text-[13px]; }')).toEqual(['text-[13px]']);
  });

  it.each([
    'bg-primary',
    'text-body',
    'w-1/2',
    'bg-primary/50',
    'data-[state=open]:bg-accent',
    'aria-[sort=ascending]:text-foreground',
    'group-data-[collapsed=true]:hidden',
    '[&>svg]:size-4',
  ])('does not flag %s, whose value is a token or whose brackets are a variant', (className) => {
    expect(arbitraryIn(`<div className="${className}" />`)).toEqual([]);
  });

  it.each([
    'const first = items[0];',
    "const value = record['key'];",
    'const options = { key: value };',
    'const gap = width - [offset];',
    "const url = 'https://example.test/a-(b)';",
  ])('does not flag code that is not a class: %s', (source) => {
    expect(arbitraryIn(source)).toEqual([]);
  });

  it('reports the line and column of each hit', () => {
    expect(findArbitraryValueClasses("const a = 'p-2';\nconst b = 'mt-1 w-[3px]';")).toEqual([
      { line: 2, column: 17, className: 'w-[3px]' },
    ]);
  });
});
