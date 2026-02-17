import type { IfcPlacement } from './IfcPlacement.js';
import type { IfcDirection } from './IfcDirection.js';

export interface IfcAxis2PlacementLinear extends IfcPlacement {
  Axis?: IfcDirection | null;
  RefDirection?: IfcDirection | null;
}
