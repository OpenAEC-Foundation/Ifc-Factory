import type { IfcStructuralConnection } from './IfcStructuralConnection.js';
import type { IfcAxis2Placement3D } from './IfcAxis2Placement3D.js';

export interface IfcStructuralPointConnection extends IfcStructuralConnection {
  ConditionCoordinateSystem?: IfcAxis2Placement3D | null;
}
