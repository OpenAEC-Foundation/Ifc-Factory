import type { IfcStructuralReaction } from './IfcStructuralReaction.js';
import type { IfcStructuralCurveActivityTypeEnum } from '../enums/IfcStructuralCurveActivityTypeEnum.js';

export interface IfcStructuralCurveReaction extends IfcStructuralReaction {
  PredefinedType: IfcStructuralCurveActivityTypeEnum;
}
