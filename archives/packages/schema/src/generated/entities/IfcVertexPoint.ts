import type { IfcVertex } from './IfcVertex.js';
import type { IfcPoint } from './IfcPoint.js';

export interface IfcVertexPoint extends IfcVertex {
  VertexGeometry: IfcPoint;
}
