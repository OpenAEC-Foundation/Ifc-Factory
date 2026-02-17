import type { IfcStructuralLoadSingleForce } from './IfcStructuralLoadSingleForce.js';
import type { IfcWarpingMomentMeasure } from '../types/IfcWarpingMomentMeasure.js';

export interface IfcStructuralLoadSingleForceWarping extends IfcStructuralLoadSingleForce {
  WarpingMoment?: IfcWarpingMomentMeasure | null;
}
