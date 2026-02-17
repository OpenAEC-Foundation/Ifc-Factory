import type { IfcStructuralAction } from './IfcStructuralAction.js';
import type { IfcProjectedOrTrueLengthEnum } from '../enums/IfcProjectedOrTrueLengthEnum.js';
import type { IfcStructuralSurfaceActivityTypeEnum } from '../enums/IfcStructuralSurfaceActivityTypeEnum.js';

export interface IfcStructuralSurfaceAction extends IfcStructuralAction {
  ProjectedOrTrue?: IfcProjectedOrTrueLengthEnum | null;
  PredefinedType: IfcStructuralSurfaceActivityTypeEnum;
}
