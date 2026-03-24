import type { IfcFlowMovingDevice } from './IfcFlowMovingDevice.js';
import type { IfcFanTypeEnum } from '../enums/IfcFanTypeEnum.js';

export interface IfcFan extends IfcFlowMovingDevice {
  PredefinedType?: IfcFanTypeEnum | null;
}
