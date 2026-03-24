import type { IfcFlowMovingDevice } from './IfcFlowMovingDevice.js';
import type { IfcPumpTypeEnum } from '../enums/IfcPumpTypeEnum.js';

export interface IfcPump extends IfcFlowMovingDevice {
  PredefinedType?: IfcPumpTypeEnum | null;
}
