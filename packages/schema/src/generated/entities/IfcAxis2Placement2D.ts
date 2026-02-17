import type { IfcPlacement } from './IfcPlacement.js';
import type { IfcDirection } from './IfcDirection.js';

export interface IfcAxis2Placement2D extends IfcPlacement {
  RefDirection?: IfcDirection | null;
}
