import type { IfcFlowTerminal } from './IfcFlowTerminal.js';
import type { IfcMobileTelecommunicationsApplianceTypeEnum } from '../enums/IfcMobileTelecommunicationsApplianceTypeEnum.js';

export interface IfcMobileTelecommunicationsAppliance extends IfcFlowTerminal {
  PredefinedType?: IfcMobileTelecommunicationsApplianceTypeEnum | null;
}
