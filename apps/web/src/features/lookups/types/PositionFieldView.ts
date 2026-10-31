import type { UseFormRegisterReturn } from 'react-hook-form';

/**
 * A row's position in a sheet, ready to render: offered only for a list of more than ten rows, so
 * a row reaches any place in one write. Its helper says the range, and so does its error.
 */
export type PositionFieldView = {
  label: string;
  helper: string;
  binding: UseFormRegisterReturn & { disabled: boolean };
  error?: string;
};
