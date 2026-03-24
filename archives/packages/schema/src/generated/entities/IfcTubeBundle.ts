import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcTubeBundleTypeEnum } from '../enums/IfcTubeBundleTypeEnum.js';

export interface IfcTubeBundle extends IfcEnergyConversionDevice {
  PredefinedType?: IfcTubeBundleTypeEnum | null;
}
