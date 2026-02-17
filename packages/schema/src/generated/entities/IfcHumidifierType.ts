import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcHumidifierTypeEnum } from '../enums/IfcHumidifierTypeEnum.js';

export interface IfcHumidifierType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcHumidifierTypeEnum;
}
