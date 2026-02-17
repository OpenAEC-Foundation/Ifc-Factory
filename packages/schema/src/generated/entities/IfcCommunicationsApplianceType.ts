import type { IfcFlowTerminalType } from './IfcFlowTerminalType.js';
import type { IfcCommunicationsApplianceTypeEnum } from '../enums/IfcCommunicationsApplianceTypeEnum.js';

export interface IfcCommunicationsApplianceType extends IfcFlowTerminalType {
  PredefinedType: IfcCommunicationsApplianceTypeEnum;
}
