import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcBoilerTypeEnum } from '../enums/IfcBoilerTypeEnum.js';

export interface IfcBoilerType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcBoilerTypeEnum;
}
