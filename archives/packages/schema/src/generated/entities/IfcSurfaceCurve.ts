import type { IfcCurve } from './IfcCurve.js';
import type { IfcPcurve } from './IfcPcurve.js';
import type { IfcPreferredSurfaceCurveRepresentation } from '../enums/IfcPreferredSurfaceCurveRepresentation.js';

export interface IfcSurfaceCurve extends IfcCurve {
  Curve3D: IfcCurve;
  AssociatedGeometry: IfcPcurve[];
  MasterRepresentation: IfcPreferredSurfaceCurveRepresentation;
}
