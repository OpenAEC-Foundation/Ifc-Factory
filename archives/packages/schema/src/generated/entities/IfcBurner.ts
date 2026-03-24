import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcBurnerTypeEnum } from '../enums/IfcBurnerTypeEnum.js';

export interface IfcBurner extends IfcEnergyConversionDevice {
  PredefinedType?: IfcBurnerTypeEnum | null;
}
