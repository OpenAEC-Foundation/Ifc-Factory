import type { IfcConnectionGeometry } from './IfcConnectionGeometry.js';
import type { IfcPointOrVertexPoint } from '../selects/IfcPointOrVertexPoint.js';

export interface IfcConnectionPointGeometry extends IfcConnectionGeometry {
  PointOnRelatingElement: IfcPointOrVertexPoint;
  PointOnRelatedElement?: IfcPointOrVertexPoint | null;
}
