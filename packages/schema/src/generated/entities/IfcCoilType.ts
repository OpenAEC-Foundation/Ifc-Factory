import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcCoilTypeEnum } from '../enums/IfcCoilTypeEnum.js';

export interface IfcCoilType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcCoilTypeEnum;
}
