import type { IfcDistributionFlowElementType } from './IfcDistributionFlowElementType.js';
import type { IfcDistributionChamberElementTypeEnum } from '../enums/IfcDistributionChamberElementTypeEnum.js';

export interface IfcDistributionChamberElementType extends IfcDistributionFlowElementType {
  PredefinedType: IfcDistributionChamberElementTypeEnum;
}
