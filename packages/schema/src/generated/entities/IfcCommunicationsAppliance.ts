import type { IfcFlowTerminal } from './IfcFlowTerminal.js';
import type { IfcCommunicationsApplianceTypeEnum } from '../enums/IfcCommunicationsApplianceTypeEnum.js';

export interface IfcCommunicationsAppliance extends IfcFlowTerminal {
  PredefinedType?: IfcCommunicationsApplianceTypeEnum | null;
}
