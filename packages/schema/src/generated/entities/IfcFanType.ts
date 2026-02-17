import type { IfcFlowMovingDeviceType } from './IfcFlowMovingDeviceType.js';
import type { IfcFanTypeEnum } from '../enums/IfcFanTypeEnum.js';

export interface IfcFanType extends IfcFlowMovingDeviceType {
  PredefinedType: IfcFanTypeEnum;
}
