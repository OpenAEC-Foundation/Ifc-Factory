import type { IfcFlowMovingDeviceType } from './IfcFlowMovingDeviceType.js';
import type { IfcPumpTypeEnum } from '../enums/IfcPumpTypeEnum.js';

export interface IfcPumpType extends IfcFlowMovingDeviceType {
  PredefinedType: IfcPumpTypeEnum;
}
