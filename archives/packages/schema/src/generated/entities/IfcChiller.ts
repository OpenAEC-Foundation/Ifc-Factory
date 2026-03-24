import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcChillerTypeEnum } from '../enums/IfcChillerTypeEnum.js';

export interface IfcChiller extends IfcEnergyConversionDevice {
  PredefinedType?: IfcChillerTypeEnum | null;
}
