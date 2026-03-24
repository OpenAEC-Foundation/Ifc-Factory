import type { IfcFlowStorageDevice } from './IfcFlowStorageDevice.js';
import type { IfcTankTypeEnum } from '../enums/IfcTankTypeEnum.js';

export interface IfcTank extends IfcFlowStorageDevice {
  PredefinedType?: IfcTankTypeEnum | null;
}
