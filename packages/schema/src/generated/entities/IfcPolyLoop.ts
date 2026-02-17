import type { IfcLoop } from './IfcLoop.js';
import type { IfcCartesianPoint } from './IfcCartesianPoint.js';

export interface IfcPolyLoop extends IfcLoop {
  Polygon: IfcCartesianPoint[];
}
