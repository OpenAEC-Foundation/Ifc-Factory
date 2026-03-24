import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcEvaporatorTypeEnum } from '../enums/IfcEvaporatorTypeEnum.js';

export interface IfcEvaporatorType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcEvaporatorTypeEnum;
}
