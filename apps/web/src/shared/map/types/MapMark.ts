/**
 * How a mark is drawn, as its caller names it: a shape and a tone, so a mark never says its meaning
 * by colour alone (filled, a bar across it, hollow, or a dashed edge).
 */
export type MapMark = {
  shape: 'filled' | 'bar' | 'hollow' | 'dashed';
  tone: 'success' | 'warning' | 'neutral' | 'muted';
};
