import type { IfcTransportationDeviceType } from './IfcTransportationDeviceType.js';
import type { IfcVehicleTypeEnum } from '../enums/IfcVehicleTypeEnum.js';

export interface IfcVehicleType extends IfcTransportationDeviceType {
  PredefinedType: IfcVehicleTypeEnum;
}
