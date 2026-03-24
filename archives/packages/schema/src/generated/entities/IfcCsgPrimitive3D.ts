import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcAxis2Placement3D } from './IfcAxis2Placement3D.js';

export interface IfcCsgPrimitive3D extends IfcGeometricRepresentationItem {
  Position: IfcAxis2Placement3D;
}
