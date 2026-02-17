import type { IfcEnergyConversionDeviceType } from './IfcEnergyConversionDeviceType.js';
import type { IfcTubeBundleTypeEnum } from '../enums/IfcTubeBundleTypeEnum.js';

export interface IfcTubeBundleType extends IfcEnergyConversionDeviceType {
  PredefinedType: IfcTubeBundleTypeEnum;
}
