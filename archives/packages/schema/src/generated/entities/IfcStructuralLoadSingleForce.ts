import type { IfcStructuralLoadStatic } from './IfcStructuralLoadStatic.js';
import type { IfcForceMeasure } from '../types/IfcForceMeasure.js';
import type { IfcTorqueMeasure } from '../types/IfcTorqueMeasure.js';

export interface IfcStructuralLoadSingleForce extends IfcStructuralLoadStatic {
  ForceX?: IfcForceMeasure | null;
  ForceY?: IfcForceMeasure | null;
  ForceZ?: IfcForceMeasure | null;
  MomentX?: IfcTorqueMeasure | null;
  MomentY?: IfcTorqueMeasure | null;
  MomentZ?: IfcTorqueMeasure | null;
}
