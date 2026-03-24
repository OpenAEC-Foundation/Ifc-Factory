import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcSolarDeviceTypeEnum } from '../enums/IfcSolarDeviceTypeEnum.js';

export interface IfcSolarDeviceType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcSolarDeviceTypeEnum;
}
