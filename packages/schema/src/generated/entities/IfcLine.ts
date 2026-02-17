import type { IfcCurve } from './IfcCurve.js';
import type { IfcCartesianPoint } from './IfcCartesianPoint.js';
import type { IfcVector } from './IfcVector.js';

export interface IfcLine extends IfcCurve {
  Pnt: IfcCartesianPoint;
  Dir: IfcVector;
}
