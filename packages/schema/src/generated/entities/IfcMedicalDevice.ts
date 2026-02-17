import type { IfcFlowTerminal } from './IfcFlowTerminal.js';
import type { IfcMedicalDeviceTypeEnum } from '../enums/IfcMedicalDeviceTypeEnum.js';

export interface IfcMedicalDevice extends IfcFlowTerminal {
  PredefinedType?: IfcMedicalDeviceTypeEnum | null;
}
