import type { IfcBoundedCurve } from './IfcBoundedCurve.js';
import type { IfcCartesianPoint } from './IfcCartesianPoint.js';

export interface IfcPolyline extends IfcBoundedCurve {
  Points: IfcCartesianPoint[];
}
