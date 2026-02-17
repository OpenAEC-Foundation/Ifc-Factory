import type { IfcTransportationDevice } from './IfcTransportationDevice.js';
import type { IfcVehicleTypeEnum } from '../enums/IfcVehicleTypeEnum.js';

export interface IfcVehicle extends IfcTransportationDevice {
  PredefinedType?: IfcVehicleTypeEnum | null;
}
