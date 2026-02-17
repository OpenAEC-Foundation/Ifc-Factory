import type { IfcDistributionFlowElement } from './IfcDistributionFlowElement.js';
import type { IfcDistributionChamberElementTypeEnum } from '../enums/IfcDistributionChamberElementTypeEnum.js';

export interface IfcDistributionChamberElement extends IfcDistributionFlowElement {
  PredefinedType?: IfcDistributionChamberElementTypeEnum | null;
}
