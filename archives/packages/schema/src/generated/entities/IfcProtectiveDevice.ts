import type { IfcFlowController } from './IfcFlowController.js';
import type { IfcProtectiveDeviceTypeEnum } from '../enums/IfcProtectiveDeviceTypeEnum.js';

export interface IfcProtectiveDevice extends IfcFlowController {
  PredefinedType?: IfcProtectiveDeviceTypeEnum | null;
}
