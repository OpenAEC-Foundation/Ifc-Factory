import type { IfcPlacement } from './IfcPlacement.js';
import type { IfcDirection } from './IfcDirection.js';

export interface IfcAxis1Placement extends IfcPlacement {
  Axis?: IfcDirection | null;
}
