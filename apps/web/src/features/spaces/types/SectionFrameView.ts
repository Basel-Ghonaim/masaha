import type { FactGroup } from '@masaha/shared/spaces';
import type { FormFailureView } from '@shared/forms';
import type { BaseSyntheticEvent } from 'react';

/**
 * A fact group's section, ready to render around its fields: its title, its date or that it is
 * missing, whether it is stale or has unsaved changes, and its actions.
 */
export type SectionFrameView = {
  id: FactGroup;
  title: string;
  /** "Updated 3 days ago", or "Not added yet" while the group is missing. */
  date: string;
  /** The badge of a group older than its threshold. */
  stale: string | null;
  /** The badge of a section with unsaved changes. */
  unsaved: string | null;
  /** A line after a save that changed nothing. */
  note: string | null;
  save: {
    label: string;
    pending: boolean;
    /** Waits out too many attempts. */
    blocked: boolean;
    submit: (event?: BaseSyntheticEvent) => void;
  };
  /** While the section has unsaved changes. */
  discard: { label: string; run: () => void } | null;
  /** While the group is saved and the section unchanged; it waits out a 429 as Save does. */
  confirm: { label: string; pending: boolean; blocked: boolean; run: () => void } | null;
  /** Why the last save or confirmation failed. */
  failure: FormFailureView | null;
};
