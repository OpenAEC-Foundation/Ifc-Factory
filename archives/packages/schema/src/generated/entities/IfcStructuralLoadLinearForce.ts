import type { IfcStructuralLoadStatic } from './IfcStructuralLoadStatic.js';
import type { IfcLinearForceMeasure } from '../types/IfcLinearForceMeasure.js';
import type { IfcLinearMomentMeasure } from '../types/IfcLinearMomentMeasure.js';

export interface IfcStructuralLoadLinearForce extends IfcStructuralLoadStatic {
  LinearForceX?: IfcLinearForceMeasure | null;
  LinearForceY?: IfcLinearForceMeasure | null;
  LinearForceZ?: IfcLinearForceMeasure | null;
  LinearMomentX?: IfcLinearMomentMeasure | null;
  LinearMomentY?: IfcLinearMomentMeasure | null;
  LinearMomentZ?: IfcLinearMomentMeasure | null;
}
