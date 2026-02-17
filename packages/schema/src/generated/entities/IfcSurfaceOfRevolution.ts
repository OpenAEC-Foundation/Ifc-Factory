import type { IfcSweptSurface } from './IfcSweptSurface.js';
import type { IfcAxis1Placement } from './IfcAxis1Placement.js';

export interface IfcSurfaceOfRevolution extends IfcSweptSurface {
  AxisPosition: IfcAxis1Placement;
}
