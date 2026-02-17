import type { IfcFlowTerminalType } from './IfcFlowTerminalType.js';
import type { IfcMobileTelecommunicationsApplianceTypeEnum } from '../enums/IfcMobileTelecommunicationsApplianceTypeEnum.js';

export interface IfcMobileTelecommunicationsApplianceType extends IfcFlowTerminalType {
  PredefinedType: IfcMobileTelecommunicationsApplianceTypeEnum;
}
