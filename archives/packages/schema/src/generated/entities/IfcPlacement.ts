import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcPoint } from './IfcPoint.js';

export interface IfcPlacement extends IfcGeometricRepresentationItem {
  Location: IfcPoint;
}
