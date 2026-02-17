import type { IfcFlowMovingDeviceType } from './IfcFlowMovingDeviceType.js';
import type { IfcCompressorTypeEnum } from '../enums/IfcCompressorTypeEnum.js';

export interface IfcCompressorType extends IfcFlowMovingDeviceType {
  PredefinedType: IfcCompressorTypeEnum;
}
