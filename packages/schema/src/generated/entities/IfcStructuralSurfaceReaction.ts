import type { IfcStructuralReaction } from './IfcStructuralReaction.js';
import type { IfcStructuralSurfaceActivityTypeEnum } from '../enums/IfcStructuralSurfaceActivityTypeEnum.js';

export interface IfcStructuralSurfaceReaction extends IfcStructuralReaction {
  PredefinedType: IfcStructuralSurfaceActivityTypeEnum;
}
