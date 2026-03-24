import type { IfcFlowStorageDevice } from './IfcFlowStorageDevice.js';
import type { IfcElectricFlowStorageDeviceTypeEnum } from '../enums/IfcElectricFlowStorageDeviceTypeEnum.js';

export interface IfcElectricFlowStorageDevice extends IfcFlowStorageDevice {
  PredefinedType?: IfcElectricFlowStorageDeviceTypeEnum | null;
}
