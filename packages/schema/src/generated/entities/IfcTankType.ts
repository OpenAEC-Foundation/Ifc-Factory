import type { IfcFlowStorageDeviceType } from './IfcFlowStorageDeviceType.js';
import type { IfcTankTypeEnum } from '../enums/IfcTankTypeEnum.js';

export interface IfcTankType extends IfcFlowStorageDeviceType {
  PredefinedType: IfcTankTypeEnum;
}
