import type { IfcFlowControllerType } from './IfcFlowControllerType.js';
import type { IfcSwitchingDeviceTypeEnum } from '../enums/IfcSwitchingDeviceTypeEnum.js';

export interface IfcSwitchingDeviceType extends IfcFlowControllerType {
  PredefinedType: IfcSwitchingDeviceTypeEnum;
}
