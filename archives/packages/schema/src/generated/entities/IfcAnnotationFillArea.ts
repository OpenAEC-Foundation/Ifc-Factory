import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcCurve } from './IfcCurve.js';

export interface IfcAnnotationFillArea extends IfcGeometricRepresentationItem {
  OuterBoundary: IfcCurve;
  InnerBoundaries?: IfcCurve[] | null;
}
