import type { IfcFlowStorageDeviceType } from './IfcFlowStorageDeviceType.js';
import type { IfcElectricFlowStorageDeviceTypeEnum } from '../enums/IfcElectricFlowStorageDeviceTypeEnum.js';

export interface IfcElectricFlowStorageDeviceType extends IfcFlowStorageDeviceType {
  PredefinedType: IfcElectricFlowStorageDeviceTypeEnum;
}
