import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcChillerTypeEnum } from '../enums/IfcChillerTypeEnum.js';

export interface IfcChillerType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcChillerTypeEnum;
}
