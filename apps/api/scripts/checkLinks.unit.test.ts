import { describe, expect, it } from 'vitest';
import { checkLinks, slugOf } from './checkLinks.ts';

// Every ancestor folder of each path is an entry too, as the walk of the repository gives them.
const entriesOf = (paths: string[]) => {
  const entries = new Set<string>();
  for (const path of paths) {
    const parts = path.split('/');
    for (let length = 1; length <= parts.length; length += 1) {
      entries.add(parts.slice(0, length).join('/'));
    }
  }
  return entries;
};

const check = (
  markdown: Record<string, string>,
  { sources = {}, also = [] }: { sources?: Record<string, string>; also?: string[] } = {},
) =>
  checkLinks({
    markdown,
    sources,
    entries: entriesOf([...Object.keys(markdown), ...Object.keys(sources), ...also]),
  });

const reasonsOf = (result: ReturnType<typeof check>) =>
  result.problems.map((problem) => `${problem.file}:${String(problem.line)} ${problem.link}`);

describe('checkLinks', () => {
  it('passes a file, a folder, an image, a heading in another file and a heading in its own file', () => {
    const result = check(
      {
        'docs/a.md': [
          '# Alpha',
          '',
          '[b](b.md) [folder](../docs) [heading](b.md#beta) [own](#alpha) ![shot](shot.png)',
        ].join('\n'),
        'docs/b.md': '# Beta\n',
      },
      { also: ['docs/shot.png'] },
    );
    expect(result.problems).toEqual([]);
    expect(result.links).toBe(5);
  });

  it('flags a link to a file that does not exist', () => {
    expect(reasonsOf(check({ 'docs/a.md': '# A\n\n[gone](gone.md)\n' }))).toEqual([
      'docs/a.md:3 gone.md',
    ]);
  });

  it('flags an image whose file does not exist', () => {
    expect(reasonsOf(check({ 'docs/a.md': '![x](missing.webp)\n' }))).toEqual([
      'docs/a.md:1 missing.webp',
    ]);
  });

  it('flags a link that climbs out of the repository', () => {
    expect(reasonsOf(check({ 'a.md': '[out](../outside.md)\n' }))).toEqual([
      'a.md:1 ../outside.md',
    ]);
  });

  it('flags a heading that does not exist, in another file and in its own', () => {
    const result = check({
      'docs/a.md': '# Alpha\n\n[x](b.md#nope) [y](#also-nope)\n',
      'docs/b.md': '# Beta\n',
    });
    expect(reasonsOf(result)).toEqual(['docs/a.md:3 b.md#nope', 'docs/a.md:3 #also-nope']);
  });

  it('numbers a repeated heading -1, -2, and flags the one past them', () => {
    const result = check({
      'a.md':
        '# A\n\n## Same\n\n## Same\n\n## Same\n\n[1](#same) [2](#same-1) [3](#same-2) [4](#same-3)\n',
    });
    expect(reasonsOf(result)).toEqual(['a.md:9 #same-3']);
  });

  it('ignores a link inside a fenced block and inside inline code', () => {
    const result = check({
      'a.md': ['```md', '[x](gone.md)', '```', '', '`[y](gone.md)` and [z](a.md)'].join('\n'),
    });
    expect(result.problems).toEqual([]);
    expect(result.links).toBe(1);
  });

  it('reports the real line of a link below a fenced block', () => {
    const result = check({ 'a.md': ['```', 'x', 'y', '```', '', '[gone](gone.md)'].join('\n') });
    expect(reasonsOf(result)).toEqual(['a.md:6 gone.md']);
  });

  it('does not take a heading inside a fenced block as an anchor', () => {
    const result = check({ 'a.md': '```\n# Hidden\n```\n\n[x](#hidden)\n' });
    expect(reasonsOf(result)).toEqual(['a.md:5 #hidden']);
  });

  it('reads src, href and every srcset candidate of an HTML tag', () => {
    const result = check(
      {
        'a.md': [
          '<img src="ok.png" srcset="ok.png 1x, gone-2x.png 2x" alt="">',
          '<a href="gone.md">x</a>',
        ].join('\n'),
      },
      { also: ['ok.png'] },
    );
    expect(reasonsOf(result)).toEqual(['a.md:1 gone-2x.png', 'a.md:2 gone.md']);
  });

  it('does not check an external link or a mailto', () => {
    const result = check({
      'a.md': '[x](https://example.com/gone) [y](mailto:a@example.com) [z](//cdn.example.com/a)\n',
    });
    expect(result.problems).toEqual([]);
    expect(result.links).toBe(0);
  });

  it('fails a path whose case differs from the file on disk', () => {
    const result = check({ 'docs/a.md': '[x](B.md)\n', 'docs/b.md': '# B\n' });
    expect(reasonsOf(result)).toEqual(['docs/a.md:1 B.md']);
  });

  it('compares an anchor written with capitals to the lowercase slug', () => {
    const result = check({ 'a.md': '# Alpha\n\n[x](#Alpha)\n' });
    expect(result.problems).toEqual([]);
  });

  it('resolves an Arabic heading', () => {
    const result = check({ 'a.md': '## مساحة العمل\n\n[x](#مساحة-العمل)\n' });
    expect(result.problems).toEqual([]);
  });

  it('flags a document path cited in a source comment that does not exist', () => {
    const result = check(
      { 'docs/real.md': '# Real\n\n## Part\n' },
      {
        sources: {
          'apps/api/src/a.ts': [
            '// see docs/real.md and docs/real.md#part',
            '// not docs/gone.md, nor docs/real.md#nope',
          ].join('\n'),
        },
      },
    );
    expect(reasonsOf(result)).toEqual([
      'apps/api/src/a.ts:2 docs/gone.md',
      'apps/api/src/a.ts:2 docs/real.md#nope',
    ]);
  });
});

describe('slugOf', () => {
  it.each([
    ['Plain heading', 'plain-heading'],
    ['`Code` and **bold** and _em_', 'code-and-bold-and-em'],
    ['A [link](x.md) in it', 'a-link-in-it'],
    ['Left › right', 'left--right'],
    ['What is a "capability"?', 'what-is-a-capability'],
    ['snake_case & dash-case', 'snake_case--dash-case'],
    ['1. Numbered', '1-numbered'],
  ])('slugs %s as %s', (heading, slug) => {
    expect(slugOf(heading)).toBe(slug);
  });
});
