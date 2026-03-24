import type { IfcPlacement } from './IfcPlacement.js';
import type { IfcDirection } from './IfcDirection.js';

export interface IfcAxis2Placement3D extends IfcPlacement {
  Axis?: IfcDirection | null;
  RefDirection?: IfcDirection | null;
}
