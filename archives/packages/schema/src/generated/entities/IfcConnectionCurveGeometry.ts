import type { IfcConnectionGeometry } from './IfcConnectionGeometry.js';
import type { IfcCurveOrEdgeCurve } from '../selects/IfcCurveOrEdgeCurve.js';

export interface IfcConnectionCurveGeometry extends IfcConnectionGeometry {
  CurveOnRelatingElement: IfcCurveOrEdgeCurve;
  CurveOnRelatedElement?: IfcCurveOrEdgeCurve | null;
}
