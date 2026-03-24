import type { IfcFlowController } from './IfcFlowController.js';
import type { IfcSwitchingDeviceTypeEnum } from '../enums/IfcSwitchingDeviceTypeEnum.js';

export interface IfcSwitchingDevice extends IfcFlowController {
  PredefinedType?: IfcSwitchingDeviceTypeEnum | null;
}
