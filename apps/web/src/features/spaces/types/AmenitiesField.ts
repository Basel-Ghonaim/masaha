import type { ReactNode } from 'react';

/** What the amenities' checklist receives from the section that sets it. */
export type AmenitiesFieldProps = {
  /** Names the group of amenities. */
  label: string;
  /** The amenities ticked, by id. */
  value: number[];
  /** The amenities the space has as saved, a retired one among them still offered. */
  linked: number[];
  /**
   * The space's retired amenities, named by its read, in the platform's order: the public catalogue
   * no longer names them, so an owner's checklist lists them from here (finding 99).
   */
  retired: { id: number; nameAr: string; nameEn: string }[];
  onValueChange: (ids: number[]) => void;
  /** While the section is sent. */
  disabled: boolean;
};

/**
 * The platform's amenities to tick, which the page fills from another capability (`lookups`), in
 * the amenities' section.
 */
export type AmenitiesField = (props: AmenitiesFieldProps) => ReactNode;
