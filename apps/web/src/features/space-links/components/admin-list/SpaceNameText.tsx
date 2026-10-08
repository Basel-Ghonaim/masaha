import type { SpaceNameView } from '../../types/AdminSpaceRowView';

/** A space's name, marked with its language and direction when it is not the interface's. */
export function SpaceNameText({ name }: { name: SpaceNameView }) {
  return (
    <span lang={name.lang} dir={name.dir} className="text-label text-foreground">
      {name.text}
    </span>
  );
}
