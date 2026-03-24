import type { IfcHalfSpaceSolid } from './IfcHalfSpaceSolid.js';
import type { IfcAxis2Placement3D } from './IfcAxis2Placement3D.js';
import type { IfcBoundedCurve } from './IfcBoundedCurve.js';

export interface IfcPolygonalBoundedHalfSpace extends IfcHalfSpaceSolid {
  Position: IfcAxis2Placement3D;
  PolygonalBoundary: IfcBoundedCurve;
}
