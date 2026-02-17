import type { IfcBoundaryCondition } from './IfcBoundaryCondition.js';
import type { IfcTranslationalStiffnessSelect } from '../selects/IfcTranslationalStiffnessSelect.js';
import type { IfcRotationalStiffnessSelect } from '../selects/IfcRotationalStiffnessSelect.js';

export interface IfcBoundaryNodeCondition extends IfcBoundaryCondition {
  TranslationalStiffnessX?: IfcTranslationalStiffnessSelect | null;
  TranslationalStiffnessY?: IfcTranslationalStiffnessSelect | null;
  TranslationalStiffnessZ?: IfcTranslationalStiffnessSelect | null;
  RotationalStiffnessX?: IfcRotationalStiffnessSelect | null;
  RotationalStiffnessY?: IfcRotationalStiffnessSelect | null;
  RotationalStiffnessZ?: IfcRotationalStiffnessSelect | null;
}
