import type { IfcFlowFittingType } from './IfcFlowFittingType.js';
import type { IfcJunctionBoxTypeEnum } from '../enums/IfcJunctionBoxTypeEnum.js';

export interface IfcJunctionBoxType extends IfcFlowFittingType {
  PredefinedType: IfcJunctionBoxTypeEnum;
}
