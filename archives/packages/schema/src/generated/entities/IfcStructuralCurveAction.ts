import type { IfcStructuralAction } from './IfcStructuralAction.js';
import type { IfcProjectedOrTrueLengthEnum } from '../enums/IfcProjectedOrTrueLengthEnum.js';
import type { IfcStructuralCurveActivityTypeEnum } from '../enums/IfcStructuralCurveActivityTypeEnum.js';

export interface IfcStructuralCurveAction extends IfcStructuralAction {
  ProjectedOrTrue?: IfcProjectedOrTrueLengthEnum | null;
  PredefinedType: IfcStructuralCurveActivityTypeEnum;
}
