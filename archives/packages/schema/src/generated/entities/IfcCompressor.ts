import type { IfcFlowMovingDevice } from './IfcFlowMovingDevice.js';
import type { IfcCompressorTypeEnum } from '../enums/IfcCompressorTypeEnum.js';

export interface IfcCompressor extends IfcFlowMovingDevice {
  PredefinedType?: IfcCompressorTypeEnum | null;
}
