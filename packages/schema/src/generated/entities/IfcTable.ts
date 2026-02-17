import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcTableRow } from './IfcTableRow.js';
import type { IfcTableColumn } from './IfcTableColumn.js';

export interface IfcTable {
  readonly type: string;
  Name?: IfcLabel | null;
  Rows?: IfcTableRow[] | null;
  Columns?: IfcTableColumn[] | null;
}
