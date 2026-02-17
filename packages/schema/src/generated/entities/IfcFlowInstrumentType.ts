import type { IfcDistributionControlElementType } from './IfcDistributionControlElementType.js';
import type { IfcFlowInstrumentTypeEnum } from '../enums/IfcFlowInstrumentTypeEnum.js';

export interface IfcFlowInstrumentType extends IfcDistributionControlElementType {
  PredefinedType: IfcFlowInstrumentTypeEnum;
}
