import type { IfcBoundaryNodeCondition } from './IfcBoundaryNodeCondition.js';
import type { IfcWarpingStiffnessSelect } from '../selects/IfcWarpingStiffnessSelect.js';

export interface IfcBoundaryNodeConditionWarping extends IfcBoundaryNodeCondition {
  WarpingStiffness?: IfcWarpingStiffnessSelect | null;
}
