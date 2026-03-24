import type { IfcEnergyConversionDevice } from './IfcEnergyConversionDevice.js';
import type { IfcCoilTypeEnum } from '../enums/IfcCoilTypeEnum.js';

export interface IfcCoil extends IfcEnergyConversionDevice {
  PredefinedType?: IfcCoilTypeEnum | null;
}
