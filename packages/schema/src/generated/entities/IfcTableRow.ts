import type { IfcValue } from '../selects/IfcValue.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';

export interface IfcTableRow {
  readonly type: string;
  RowCells?: IfcValue[] | null;
  IsHeading?: IfcBoolean | null;
}
