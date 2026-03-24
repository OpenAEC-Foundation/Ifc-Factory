import type { IfcStructuralConnection } from './IfcStructuralConnection.js';
import type { IfcDirection } from './IfcDirection.js';

export interface IfcStructuralCurveConnection extends IfcStructuralConnection {
  AxisDirection: IfcDirection;
}
