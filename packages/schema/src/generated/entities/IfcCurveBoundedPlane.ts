import type { IfcBoundedSurface } from './IfcBoundedSurface.js';
import type { IfcPlane } from './IfcPlane.js';
import type { IfcCurve } from './IfcCurve.js';

export interface IfcCurveBoundedPlane extends IfcBoundedSurface {
  BasisSurface: IfcPlane;
  OuterBoundary: IfcCurve;
  InnerBoundaries: IfcCurve[];
}
