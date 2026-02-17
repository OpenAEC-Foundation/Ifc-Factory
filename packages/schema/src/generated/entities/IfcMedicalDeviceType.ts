import type { IfcFlowTerminalType } from './IfcFlowTerminalType.js';
import type { IfcMedicalDeviceTypeEnum } from '../enums/IfcMedicalDeviceTypeEnum.js';

export interface IfcMedicalDeviceType extends IfcFlowTerminalType {
  PredefinedType: IfcMedicalDeviceTypeEnum;
}
