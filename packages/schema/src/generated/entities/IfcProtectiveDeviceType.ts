import type { IfcFlowControllerType } from './IfcFlowControllerType.js';
import type { IfcProtectiveDeviceTypeEnum } from '../enums/IfcProtectiveDeviceTypeEnum.js';

export interface IfcProtectiveDeviceType extends IfcFlowControllerType {
  PredefinedType: IfcProtectiveDeviceTypeEnum;
}
