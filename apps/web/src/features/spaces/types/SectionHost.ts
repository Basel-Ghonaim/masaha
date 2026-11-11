import type { AdminSpace } from '@masaha/shared/spaces';
import type { ReactNode } from 'react';
import type { EditorPlace } from './EditorPlace';
import type { SheetId } from './SectionId';
import type { SheetHost } from './SheetHost';

/**
 * What the editor hands every section: the place, the space as read, whether the place may edit it,
 * a page's notice to show inside it (a visitor's report, G3), and the Sheets: one's host by its id,
 * and the way to open one, its own or another's (the prices' «أضف وردية»).
 */
export type SectionHost = {
  place: EditorPlace;
  space: AdminSpace;
  editable: boolean;
  notice: ReactNode;
  sheet: (section: SheetId) => SheetHost;
  openSheet: (section: SheetId) => void;
};
