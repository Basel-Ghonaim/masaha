import type { NamedLineView } from '../../types/NamedLineView';

/**
 * A line that names a space, the name set apart and marked with its language and direction when it
 * is not the interface's: an English-only name in an Arabic sentence.
 */
export function NamedLine({ line }: { line: NamedLineView }) {
  return (
    <>
      {line.before}
      <span lang={line.name.lang} dir={line.name.dir}>
        {line.name.text}
      </span>
      {line.after}
    </>
  );
}
