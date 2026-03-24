import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcEvaporativeCoolerTypeEnum } from '../enums/IfcEvaporativeCoolerTypeEnum.js';

export interface IfcEvaporativeCoolerType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcEvaporativeCoolerTypeEnum;
}
