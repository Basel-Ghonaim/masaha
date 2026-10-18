// A character no line holds, which stands in for the name while the line is cut around it.
const MARK = '';

/**
 * The words of a line before and after the name it takes, so the name can be set as an element of
 * its own, marked with its language, while the line stays whole in the catalogue.
 */
export function lineParts(line: (values: { name: string }) => string): {
  before: string;
  after: string;
} {
  const [before = '', after = ''] = line({ name: MARK }).split(MARK);
  return { before, after };
}
