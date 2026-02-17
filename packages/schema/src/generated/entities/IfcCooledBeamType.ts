import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcCooledBeamTypeEnum } from '../enums/IfcCooledBeamTypeEnum.js';

export interface IfcCooledBeamType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcCooledBeamTypeEnum;
}
