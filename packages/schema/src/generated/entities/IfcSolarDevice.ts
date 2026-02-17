import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcSolarDeviceTypeEnum } from '../enums/IfcSolarDeviceTypeEnum.js';

export interface IfcSolarDevice extends IfcEnergyConversionDevice {
  PredefinedType?: IfcSolarDeviceTypeEnum | null;
}
