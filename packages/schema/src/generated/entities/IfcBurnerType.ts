import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcBurnerTypeEnum } from '../enums/IfcBurnerTypeEnum.js';

export interface IfcBurnerType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcBurnerTypeEnum;
}
