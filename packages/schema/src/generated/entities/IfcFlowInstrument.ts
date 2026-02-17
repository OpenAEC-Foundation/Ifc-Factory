import type { IfcDistributionControlElement } from './IfcDistributionControlElement.js';
import type { IfcFlowInstrumentTypeEnum } from '../enums/IfcFlowInstrumentTypeEnum.js';

export interface IfcFlowInstrument extends IfcDistributionControlElement {
  PredefinedType?: IfcFlowInstrumentTypeEnum | null;
}
